#!/usr/bin/env python3
"""
iNoah Status - Check status of all services
"""

import requests
from pathlib import Path

# Service definitions
SERVICES = [
    {"name": "inoah-hands", "port": 8000, "description": "The Hands"},
    {"name": "inoah-brain", "port": 8001, "description": "The Voice"},
    {"name": "inoah-photo", "port": 8002, "description": "The Face"},
    {"name": "inoah-dating", "port": 8010, "description": "The Wingman"},
    {"name": "inoah-social", "port": 8011, "description": "The Creator"},
]


def check_service(name: str, port: int) -> dict:
    """Check if a service is healthy."""
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=3)
        if response.status_code == 200:
            return {
                "status": "healthy",
                "data": response.json()
            }
        else:
            return {
                "status": "error",
                "data": {"code": response.status_code}
            }
    except requests.exceptions.ConnectionError:
        return {"status": "offline", "data": None}
    except requests.exceptions.Timeout:
        return {"status": "timeout", "data": None}
    except Exception as e:
        return {"status": "error", "data": {"error": str(e)}}


def check_lmstudio() -> dict:
    """Check LM Studio status."""
    try:
        response = requests.get("http://localhost:1234/v1/models", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = [m["id"] for m in data.get("data", [])]
            return {
                "status": "healthy",
                "models": models
            }
        return {"status": "error", "models": []}
    except:
        return {"status": "offline", "models": []}


def main():
    print("=" * 60)
    print("iNoah System Status")
    print("=" * 60)
    
    # Check LM Studio
    print("\n[LM Studio]")
    lmstudio = check_lmstudio()
    if lmstudio["status"] == "healthy":
        print(f"  Status: ✓ Running")
        if lmstudio['models']:
            print(f"  Models: {', '.join(lmstudio['models'][:3])}")
    else:
        print(f"  Status: ✗ {lmstudio['status']}")
    
    # Check services
    print("\n[Services]")
    
    all_healthy = True
    
    for service in SERVICES:
        result = check_service(service["name"], service["port"])
        status = result["status"]
        
        if status == "healthy":
            icon = "✓"
        elif status == "offline":
            icon = "✗"
            all_healthy = False
        else:
            icon = "?"
            all_healthy = False
        
        print(f"  {icon} {service['name']:<15} (:{service['port']}) - {service['description']}")
        
        if status == "healthy" and result.get("data"):
            # Show additional info if available
            data = result["data"]
            if "llm_available" in data:
                print(f"      LLM: {'✓' if data['llm_available'] else '✗'}")
            elif "ollama_available" in data:
                print(f"      LLM: {'✓' if data['ollama_available'] else '✗'}")
    
    # Summary
    print("\n" + "=" * 60)
    if all_healthy:
        print("All services operational.")
    else:
        print("Some services are offline. Run start_all.py to start.")
    print("=" * 60)


if __name__ == "__main__":
    main()
