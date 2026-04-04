"""
Central Configuration Loader for iNoah System.
All services import from here to get unified configuration.
"""

import json
import os
from pathlib import Path
from typing import Any, Optional

# Find config.json - check multiple locations
def _find_config_path() -> Path:
    """Find the config.json file in standard locations."""
    # 1. Environment variable override
    if os.environ.get("INOAH_CONFIG_PATH"):
        return Path(os.environ["INOAH_CONFIG_PATH"])
    
    # 2. Relative to this file (in inoah-core package)
    package_config = Path(__file__).parent.parent.parent.parent / "config.json"
    if package_config.exists():
        return package_config
    
    # 3. Projects directory (sibling to inoah-core)
    projects_config = Path(__file__).parent.parent.parent.parent.parent / "inoah-core" / "config.json"
    if projects_config.exists():
        return projects_config
    
    # 4. Default to package location
    return package_config


CONFIG_PATH = _find_config_path()

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
        config_path = _find_config_path()
        if not config_path.exists():
            raise FileNotFoundError(
                f"Config file not found: {config_path}\n"
                "Ensure inoah-core/config.json exists or set INOAH_CONFIG_PATH."
            )
        
        with open(config_path, "r", encoding="utf-8") as f:
            _config_cache = json.load(f)
    
    return _config_cache


def get_nested(path: str, default: Any = None) -> Any:
    """
    Get a nested config value using dot notation.
    
    Examples:
        get_nested("llm.host") -> "http://localhost:1234"
        get_nested("services.inoah-hands.port") -> 8000
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


def get_llm_host() -> str:
    """Get LLM API host URL (LM Studio)."""
    return get_nested("llm.host", "http://localhost:1234")


def get_llm_provider() -> str:
    """Get LLM provider name."""
    return get_nested("llm.provider", "lmstudio")


def get_model(model_type: str) -> str:
    """
    Get model name by type.
    
    Args:
        model_type: Either "reasoning" or "vision"
        
    Returns:
        Model name (e.g., "local-model")
    """
    return get_nested(f"llm.models.{model_type}", "local-model")


def get_service_config(service_name: str) -> dict:
    """
    Get configuration for a specific service.
    
    Args:
        service_name: Service name (e.g., "inoah-hands", "inoah-brain")
        
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


# Backwards compatibility aliases
def get_ollama_host() -> str:
    """Deprecated: Use get_llm_host() instead."""
    return get_llm_host()
