"""
Central Configuration Loader for iNoah System.
All services import from here to get unified configuration.
"""

import json
import os
from pathlib import Path
from typing import Any, Optional

# Find config.json relative to this file (in inoahglobal/)
CONFIG_PATH = Path(__file__).parent.parent / "config.json"

_config_cache: Optional[dict] = None


def get_config(reload: bool = False) -> dict:
    """
    Load and return the central configuration.
    
    Args:
        reload: Force reload from disk (ignores cache)
        
    Returns:
        Configuration dictionary
        
    Raises:
        FileNotFoundError: If config.json doesn't exist
        json.JSONDecodeError: If config.json is malformed
    """
    global _config_cache
    
    if _config_cache is None or reload:
        if not CONFIG_PATH.exists():
            raise FileNotFoundError(
                f"Config file not found: {CONFIG_PATH}\n"
                "Ensure inoahglobal/config.json exists."
            )
        
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            _config_cache = json.load(f)
    
    return _config_cache


def get_nested(path: str, default: Any = None) -> Any:
    """
    Get a nested config value using dot notation.
    
    Examples:
        get_nested("ollama.host") -> "http://localhost:11434"
        get_nested("services.serverbridge.port") -> 8000
        get_nested("missing.key", "fallback") -> "fallback"
    
    Args:
        path: Dot-separated path to the config value
        default: Value to return if path doesn't exist
        
    Returns:
        The config value or default
    """
    config = get_config()
    keys = path.split(".")
    
    value = config
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default
    
    return value


def get_ollama_host() -> str:
    """Get Ollama API host URL."""
    return get_nested("ollama.host", "http://localhost:11434")


def get_model(model_type: str) -> str:
    """
    Get model name by type.
    
    Args:
        model_type: Either "reasoning" or "vision"
        
    Returns:
        Model name (e.g., "llama3", "llava")
    """
    return get_nested(f"ollama.models.{model_type}", "llama3")


def get_service_config(service_name: str) -> dict:
    """
    Get configuration for a specific service.
    
    Args:
        service_name: "serverbridge", "inoahbrain", or "inoahphoto"
        
    Returns:
        Service config dict with port, host, etc.
    """
    return get_nested(f"services.{service_name}", {"port": 8000, "host": "0.0.0.0"})


def get_path(path_name: str) -> Path:
    """
    Get a configured path.
    
    Args:
        path_name: Key from paths section (e.g., "photo_raw", "photo_output")
        
    Returns:
        Path object
    """
    path_str = get_nested(f"paths.{path_name}", "")
    return Path(path_str) if path_str else Path(".")


def get_identity() -> dict:
    """Get the identity configuration for Noah."""
    return get_nested("identity", {})


def get_style_rules() -> list:
    """Get writing style rules."""
    return get_nested("identity.style_rules", [])


def get_api_secret() -> str:
    """
    Get API secret key from environment.
    Falls back to default for development.
    """
    return os.getenv("AGENT_SECRET_KEY", "1234")



