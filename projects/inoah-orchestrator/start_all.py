#!/usr/bin/env python3
"""
iNoah Orchestrator - Start all services
Manages startup of all iNoah ecosystem services.
"""

import os
import sys
import time
import signal
import subprocess
from pathlib import Path
from typing import Optional

# Find the projects directory
SCRIPT_DIR = Path(__file__).parent
PROJECTS_DIR = SCRIPT_DIR.parent

# Service definitions
SERVICES = [
    {
        "name": "inoah-hands",
        "port": 8000,
        "dir": PROJECTS_DIR / "inoah-hands",
        "command": ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        "description": "The Hands - Desktop interaction"
    },
    {
        "name": "inoah-brain",
        "port": 8001,
        "dir": PROJECTS_DIR / "inoah-brain",
        "command": ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"],
        "description": "The Voice - Cognitive engine"
    },
    {
        "name": "inoah-photo",
        "port": 8002,
        "dir": PROJECTS_DIR / "inoah-photo",
        "command": ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"],
        "description": "The Face - Photo processing"
    },
    {
        "name": "inoah-dating",
        "port": 8010,
        "dir": PROJECTS_DIR / "inoah-dating",
        "command": ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"],
        "description": "The Wingman - Dating automation"
    },
    {
        "name": "inoah-social",
        "port": 8011,
        "dir": PROJECTS_DIR / "inoah-social",
        "command": ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8011"],
        "description": "The Creator - Social media"
    },
]

# Track running processes
processes = []


def get_venv_python(service_dir: Path) -> str:
    """Get the Python executable from the service's virtual environment."""
    venv_python = service_dir / "venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    
    # Windows fallback
    venv_python_win = service_dir / "venv" / "Scripts" / "python.exe"
    if venv_python_win.exists():
        return str(venv_python_win)
    
    # Use system python
    return sys.executable


def check_lmstudio() -> bool:
    """Check if LM Studio is running."""
    try:
        import requests
        response = requests.get("http://localhost:1234/v1/models", timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def kill_port(port: int):
    """Kill any process using the specified port."""
    try:
        # macOS/Linux
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    os.kill(int(pid), signal.SIGTERM)
                    print(f"  Killed process {pid} on port {port}")
                except:
                    pass
            time.sleep(0.5)
    except FileNotFoundError:
        # lsof not available (Windows)
        pass


def start_service(service: dict) -> Optional[subprocess.Popen]:
    """Start a single service."""
    name = service["name"]
    port = service["port"]
    directory = service["dir"]
    command = service["command"]
    description = service["description"]
    
    # Check if directory exists
    if not directory.exists():
        print(f"  [!] Directory not found: {directory}")
        return None
    
    # Check if main.py exists
    main_file = directory / "main.py"
    if not main_file.exists():
        print(f"  [!] main.py not found in {directory}")
        return None
    
    # Kill any existing process on the port
    kill_port(port)
    
    # Get venv python
    python_path = get_venv_python(directory)
    
    # Build command with venv python
    actual_command = [python_path] + command[1:]
    
    # Set environment
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    
    # Add inoah-core to PYTHONPATH
    core_path = PROJECTS_DIR / "inoah-core" / "src"
    if "PYTHONPATH" in env:
        env["PYTHONPATH"] = f"{core_path}:{env['PYTHONPATH']}"
    else:
        env["PYTHONPATH"] = str(core_path)
    
    print(f"  Starting {name} on port {port}...")
    print(f"    {description}")
    
    try:
        process = subprocess.Popen(
            actual_command,
            cwd=str(directory),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Wait a bit and check if it started
        time.sleep(1)
        
        if process.poll() is not None:
            # Process exited
            output = process.stdout.read() if process.stdout else ""
            print(f"    [!] Failed to start: {output[:200]}")
            return None
        
        print(f"    [+] Started (PID: {process.pid})")
        return process
        
    except Exception as e:
        print(f"    [!] Exception: {e}")
        return None


def shutdown(sig=None, frame=None):
    """Graceful shutdown of all services."""
    print("\n\n[*] Shutting down all services...")
    
    for process in processes:
        if process and process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
    
    print("[*] All services stopped.")
    sys.exit(0)


def main():
    print("=" * 60)
    print("iNoah Orchestrator - Service Manager")
    print("=" * 60)
    
    # Check LM Studio
    print("\n[*] Checking LM Studio availability...")
    if check_lmstudio():
        print("    [+] LM Studio is running")
    else:
        print("    [!] WARNING: LM Studio is not running")
        print("        Services requiring LLM will fail")
        print("        Start LM Studio and load a model on port 1234")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    
    # Start services
    print("\n[*] Starting services...")
    
    for service in SERVICES:
        process = start_service(service)
        if process:
            processes.append(process)
    
    started_count = len([p for p in processes if p is not None])
    
    print(f"\n[*] Started {started_count}/{len(SERVICES)} services")
    print("\n" + "=" * 60)
    print("Service URLs:")
    for service in SERVICES:
        print(f"  {service['name']}: http://localhost:{service['port']}")
    print("=" * 60)
    
    print("\nPress Ctrl+C to stop all services...")
    
    # Keep running
    try:
        while True:
            # Check if any process has died
            for i, process in enumerate(processes):
                if process and process.poll() is not None:
                    print(f"\n[!] Service died: {SERVICES[i]['name']}")
            time.sleep(5)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
