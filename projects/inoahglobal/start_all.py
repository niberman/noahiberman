"""
iNoah System Orchestrator
Starts all iNoah services in the correct order using their dedicated virtual environments.
"""

import os
import sys
import time
import subprocess
import signal
import socket
import psutil
from pathlib import Path

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent))

from shared import get_config, get_logger, OllamaClient
from shared.config_loader import get_service_config

# Logger
logger = get_logger("orchestrator")

# --- CONFIGURATION: SERVICE PATHS ---
# We point directly to the VENV python executable for each service to ensure dependencies are found.
SERVERBRIDGE_DIR = Path(__file__).parent.parent / "serverbridge-main"
BRAIN_DIR = Path(__file__).parent.parent / "inoahbrain"
BRAIN_PUBLIC_DIR = Path(__file__).parent.parent / "inoahbrain-public"
PHOTO_DIR = Path(__file__).parent.parent / "inoahphoto"

# Helper to find the right python.exe on Windows
def get_venv_python(directory):
    return str(directory / "venv" / "Scripts" / "python.exe")

SERVICES = [
    {
        "name": "serverbridge",
        "command": [
            get_venv_python(SERVERBRIDGE_DIR), 
            "-m", "uvicorn", "main:app", 
            "--host", "0.0.0.0", 
            "--port", str(get_service_config("serverbridge").get("port", 8000))
        ],
        "cwd": str(SERVERBRIDGE_DIR),
        "port": 8000
    },
    {
        "name": "inoahbrain",
        "command": [
            get_venv_python(BRAIN_DIR), 
            "-m", "uvicorn", "main:app", 
            "--host", "0.0.0.0", 
            "--port", str(get_service_config("inoahbrain").get("port", 8001))
        ],
        "cwd": str(BRAIN_DIR),
        "port": 8001
    },
    {
        "name": "inoahbrain_public",
        "command": [
            # Use the PRIVATE brain's venv to avoid reinstalling dependencies
            get_venv_python(BRAIN_DIR),
            "-m", "uvicorn", "main:app", 
            "--host", "0.0.0.0", 
            "--port", str(get_service_config("inoahbrain_public").get("port", 8003))
        ],
        "cwd": str(BRAIN_PUBLIC_DIR),
        "port": 8003
    },
    {
        "name": "inoahphoto",
        "command": [
            # Fallback to system python if venv doesn't exist yet for Photo
            get_venv_python(PHOTO_DIR) if (PHOTO_DIR / "venv").exists() else sys.executable, 
            "-m", "uvicorn", "main:app", 
            "--host", "0.0.0.0", 
            "--port", str(get_service_config("inoahphoto").get("port", 8002))
        ],
        "cwd": str(PHOTO_DIR),
        "port": 8002
    },
]

# Track running processes
processes = []


def kill_processes_on_ports(ports: list):
    """Kill any processes using the specified ports."""
    killed_any = False
    
    for port in ports:
        for conn in psutil.net_connections(kind='inet'):
            if conn.laddr.port == port and conn.status == 'LISTEN':
                try:
                    proc = psutil.Process(conn.pid)
                    proc_name = proc.name()
                    logger.info(f"Killing process {proc_name} (PID: {conn.pid}) on port {port}")
                    proc.terminate()
                    try:
                        proc.wait(timeout=3)
                    except psutil.TimeoutExpired:
                        proc.kill()
                    killed_any = True
                except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                    logger.warning(f"Could not kill process on port {port}: {e}")
    
    if killed_any:
        time.sleep(1)  # Give OS time to release ports
        logger.info("Cleared existing processes from ports")
    
    return killed_any


def check_ollama():
    """Check if Ollama is running and available."""
    logger.info("Checking Ollama availability...")
    client = OllamaClient()
    
    if client.is_available():
        models = client.list_models()
        logger.info(f"Ollama is online. Models available: {', '.join(models) if models else 'none'}")
        
        # Check for required models
        config = get_config()
        required = [
            config.get("ollama", {}).get("models", {}).get("reasoning", "llama3"),
            config.get("ollama", {}).get("models", {}).get("vision", "llava"),
        ]
        
        # Simple check: just see if the string is contained in any available model
        missing = []
        for req in required:
            # Handle "llama3:latest" vs "llama3" mismatch
            base_name = req.split(':')[0]
            if not any(base_name in m for m in models):
                missing.append(req)

        if missing:
            logger.warning(f"Missing models: {', '.join(missing)}")
            logger.warning("Run: ollama pull <model_name>")
        
        return True
    else:
        logger.error("Ollama is not running!")
        logger.error("Start Ollama first: ollama serve")
        return False


def start_service(service: dict) -> subprocess.Popen:
    """Start a single service."""
    name = service["name"]
    command = service["command"]
    cwd = service["cwd"]
    port = service["port"]
    
    if not Path(cwd).exists():
        logger.error(f"Service directory not found: {cwd}")
        return None
    
    logger.info(f"Starting {name} on port {port}...")
    
    try:
        # Start the service
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        
        # Give it a moment to start
        time.sleep(2)
        
        if process.poll() is None:
            logger.info(f"{name} started (PID: {process.pid})")
            return process
        else:
            # If it died immediately, print the error
            logger.error(f"{name} failed to start. Exit code: {process.returncode}")
            output = process.stdout.read()
            logger.error(f"Output:\n{output}")
            return None
    except Exception as e:
        logger.error(f"Failed to launch {name}: {e}")
        return None


def stop_all():
    """Stop all running services."""
    logger.info("Stopping all services...")
    
    for process in processes:
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
    
    logger.info("All services stopped.")


def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    print()  # New line after ^C
    stop_all()
    sys.exit(0)


def main():
    """Main orchestrator entry point."""
    logger.info("=" * 60)
    logger.info("iNoah System Orchestrator")
    logger.info("=" * 60)
    
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check Ollama first
    if not check_ollama():
        logger.error("Cannot start without Ollama. Exiting.")
        sys.exit(1)
    
    # Kill any existing processes on our ports
    logger.info("-" * 60)
    ports = [service["port"] for service in SERVICES]
    kill_processes_on_ports(ports)
    
    # Start all services
    logger.info("-" * 60)
    logger.info("Starting services...")
    
    for service in SERVICES:
        process = start_service(service)
        if process:
            processes.append(process)
        else:
            logger.warning(f"Skipping {service['name']} due to startup failure")
            # We append None to keep indices aligned
            processes.append(None)
    
    # Summary
    logger.info("-" * 60)
    logger.info("iNoah System Status:")
    for service in SERVICES:
        status = "ONLINE" if (processes[SERVICES.index(service)] is not None) else "OFFLINE"
        logger.info(f"  {service['name']}: http://localhost:{service['port']} [{status}]")
    logger.info("-" * 60)
    logger.info("Press Ctrl+C to stop all services")
    
    # Keep running and forward output
    try:
        while True:
            active_count = 0
            for i, process in enumerate(processes):
                if process and process.poll() is None:
                    active_count += 1
                    # Read and print any output
                    # We use a non-blocking read here if possible, but readline block is okay for now
                    # strictly because we used bufsize=1
                    line = process.stdout.readline()
                    if line:
                        print(f"[{SERVICES[i]['name']}] {line.rstrip()}")
                elif process:
                    # Process died during runtime
                    logger.warning(f"{SERVICES[i]['name']} stopped unexpectedly")
                    # Print remaining logs
                    rest = process.stdout.read()
                    if rest: print(f"[{SERVICES[i]['name']}] {rest}")
                    processes[i] = None
            
            # Check if all processes are dead
            if active_count == 0 and len(SERVICES) > 0:
                logger.error("All services have stopped!")
                break
            
            # Prevent CPU spin if no logs
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        pass
    finally:
        stop_all()


if __name__ == "__main__":
    main()
