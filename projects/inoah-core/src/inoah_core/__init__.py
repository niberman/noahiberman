"""
iNoah Core - The Hub
Central infrastructure shared across all iNoah services.
"""

from .shared import get_config, get_logger, LLMClient, OllamaClient, CONFIG_PATH
from .shared.config_loader import (
    get_nested,
    get_llm_host,
    get_llm_provider,
    get_ollama_host,  # Backwards compatibility
    get_model,
    get_service_config,
    get_path,
    get_identity,
    get_style_rules,
    get_api_secret,
)

__all__ = [
    # Config
    "get_config",
    "get_nested",
    "get_llm_host",
    "get_llm_provider",
    "get_ollama_host",  # Backwards compatibility
    "get_model",
    "get_service_config",
    "get_path",
    "get_identity",
    "get_style_rules",
    "get_api_secret",
    "CONFIG_PATH",
    # Logging
    "get_logger",
    # LLM
    "LLMClient",
    "OllamaClient",  # Backwards compatibility alias
]

__version__ = "1.0.0"
