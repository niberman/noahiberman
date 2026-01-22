"""
Base Tool - Abstract base class for all iNoah automation tools.
Provides access to HandsClient and OllamaClient.
"""

import os
import sys
from abc import ABC, abstractmethod
from typing import Optional

# Add inoahglobal to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from inoahglobal.shared import OllamaClient, get_logger
from inoahglobal.shared.config_loader import get_identity, get_style_rules

# Import HandsClient from core
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.hands import HandsClient


class BaseTool(ABC):
    """
    Abstract base class for automation tools.
    Provides shared access to:
    - HandsClient (screen control)
    - OllamaClient (AI models)
    - Identity and style configuration
    """
    
    def __init__(self, tool_name: str):
        """
        Initialize the tool with shared clients.
        
        Args:
            tool_name: Name of the tool for logging
        """
        self.tool_name = tool_name
        self.logger = get_logger(tool_name)
        
        # Initialize shared clients
        self.hands = HandsClient()
        self.ollama = OllamaClient()
        
        # Load identity context
        self.identity = get_identity()
        self.style_rules = get_style_rules()
        
        # Running state
        self._running = False
        
        self.logger.info(f"{tool_name} initialized")
    
    @property
    def is_running(self) -> bool:
        """Check if the tool is currently running."""
        return self._running
    
    def get_identity_context(self) -> str:
        """Get formatted identity context string."""
        name = self.identity.get("name", "Noah")
        context = self.identity.get("context", [])
        return f"{name} - {', '.join(context)}"
    
    def get_style_prompt(self) -> str:
        """Get style rules as a prompt string."""
        rules = "\n".join(f"- {rule}" for rule in self.style_rules)
        return f"STYLE RULES:\n{rules}"
    
    def check_prerequisites(self) -> tuple[bool, str]:
        """
        Check if all prerequisites are met.
        
        Returns:
            Tuple of (success, message)
        """
        # Check Ollama
        if not self.ollama.is_available():
            return False, "Ollama is not available"
        
        # Check ServerBridge
        if not self.hands.is_available():
            return False, "ServerBridge is not available"
        
        return True, "All prerequisites met"
    
    def start(self) -> dict:
        """
        Start the tool.
        
        Returns:
            Status dictionary
        """
        if self._running:
            return {"status": "already_running", "tool": self.tool_name}
        
        # Check prerequisites
        ok, msg = self.check_prerequisites()
        if not ok:
            self.logger.error(f"Prerequisites not met: {msg}")
            return {"status": "error", "message": msg}
        
        self._running = True
        self.logger.info(f"{self.tool_name} started")
        
        return {"status": "started", "tool": self.tool_name}
    
    def stop(self) -> dict:
        """
        Stop the tool.
        
        Returns:
            Status dictionary
        """
        if not self._running:
            return {"status": "not_running", "tool": self.tool_name}
        
        self._running = False
        self.logger.info(f"{self.tool_name} stopped")
        
        return {"status": "stopped", "tool": self.tool_name}
    
    @abstractmethod
    def run(self, *args, **kwargs):
        """
        Main run method - must be implemented by subclasses.
        """
        pass



