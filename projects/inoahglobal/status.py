"""
iNoah System Status Checker
Checks health of all iNoah services and Ollama.
"""

import sys
from pathlib import Path

import requests

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent))

from shared import get_config, get_logger, OllamaClient
from shared.config_loader import get_service_config

# Logger
logger = get_logger("status")

# Service definitions
SERVICES = [
    ("serverbridge", get_service_config("serverbridge").get("port", 8000)),
    ("inoahbrain", get_service_config("inoahbrain").get("port", 8001)),
    ("inoahphoto", get_service_config("inoahphoto").get("port", 8002)),
]


def check_ollama() -> dict:
    """Check Ollama status and models."""
    client = OllamaClient()
    config = get_config()
    
    result = {
        "service": "ollama",
        "status": "offline",
        "models": [],
        "required_models": [],
        "missing_models": []
    }
    
    if client.is_available():
        result["status"] = "online"
        result["models"] = client.list_models()
        
        # Check required models
        ollama_config = config.get("ollama", {}).get("models", {})
        required = [
            ollama_config.get("reasoning", "llama3"),
            ollama_config.get("vision", "llava"),
        ]
        result["required_models"] = required
        result["missing_models"] = [m for m in required if m not in result["models"]]
    
    return result


def check_service(name: str, port: int) -> dict:
    """Check a single service health."""
    result = {
        "service": name,
        "port": port,
        "status": "offline",
        "details": None
    }
    
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=3)
        if response.status_code == 200:
            result["status"] = "online"
            result["details"] = response.json()
    except requests.exceptions.ConnectionError:
        result["status"] = "offline"
    except requests.exceptions.Timeout:
        result["status"] = "timeout"
    except Exception as e:
        result["status"] = "error"
        result["details"] = str(e)
    
    return result


def print_status(result: dict, indent: int = 2):
    """Print status result with formatting."""
    prefix = " " * indent
    status = result["status"]
    
    # Color coding
    if status == "online":
        status_str = f"\033[32m{status}\033[0m"  # Green
    elif status == "offline":
        status_str = f"\033[31m{status}\033[0m"  # Red
    else:
        status_str = f"\033[33m{status}\033[0m"  # Yellow
    
    service = result["service"]
    port = result.get("port", "")
    port_str = f" (:{port})" if port else ""
    
    print(f"{prefix}{service}{port_str}: {status_str}")
    
    # Additional details
    if result.get("models"):
        print(f"{prefix}  Models: {', '.join(result['models'])}")
    
    if result.get("missing_models"):
        print(f"{prefix}  \033[33mMissing: {', '.join(result['missing_models'])}\033[0m")


def main():
    """Main status check entry point."""
    print()
    print("=" * 50)
    print("iNoah System Status")
    print("=" * 50)
    
    # Check config
    config = get_config()
    print(f"\nConfig Version: {config.get('version', 'unknown')}")
    
    # Check Ollama
    print("\n--- Ollama ---")
    ollama_status = check_ollama()
    print_status(ollama_status)
    
    # Check services
    print("\n--- Services ---")
    all_online = True
    
    for name, port in SERVICES:
        status = check_service(name, port)
        print_status(status)
        
        if status["status"] != "online":
            all_online = False
    
    # Summary
    print("\n" + "=" * 50)
    if all_online and ollama_status["status"] == "online":
        print("\033[32mAll systems operational.\033[0m")
    else:
        print("\033[33mSome services are offline.\033[0m")
        if ollama_status["status"] == "offline":
            print("  - Start Ollama: ollama serve")
        if not all_online:
            print("  - Start services: python start_all.py")
    
    print()
    return 0 if all_online else 1


if __name__ == "__main__":
    sys.exit(main())



