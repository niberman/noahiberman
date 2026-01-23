"""
iNoah Shared Infrastructure
Central utilities shared across all iNoah services.
"""

from .config_loader import get_config, CONFIG_PATH
from .llm_client import LLMClient, OllamaClient  # OllamaClient is alias for backwards compat
from .logger import get_logger

__all__ = [
    "get_config",
    "CONFIG_PATH",
    "LLMClient",
    "OllamaClient",  # Backwards compatibility
    "get_logger",
]
