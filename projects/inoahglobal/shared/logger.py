"""
Unified Logging for iNoah System.
Provides consistent log format across all services.
"""

import logging
import sys
from typing import Optional


# ANSI color codes for terminal output
COLORS = {
    "DEBUG": "\033[36m",     # Cyan
    "INFO": "\033[32m",      # Green
    "WARNING": "\033[33m",   # Yellow
    "ERROR": "\033[31m",     # Red
    "CRITICAL": "\033[35m",  # Magenta
    "RESET": "\033[0m",      # Reset
    "BOLD": "\033[1m",       # Bold
}


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors and service name prefix."""
    
    def __init__(self, service_name: str, use_colors: bool = True):
        self.service_name = service_name
        self.use_colors = use_colors
        super().__init__()
    
    def format(self, record: logging.LogRecord) -> str:
        # Timestamp
        timestamp = self.formatTime(record, "%H:%M:%S")
        
        # Level
        level = record.levelname
        
        # Message
        message = record.getMessage()
        
        if self.use_colors:
            color = COLORS.get(level, COLORS["RESET"])
            reset = COLORS["RESET"]
            bold = COLORS["BOLD"]
            
            return (
                f"{color}[{timestamp}]{reset} "
                f"{bold}[{self.service_name}]{reset} "
                f"{color}{level}{reset}: {message}"
            )
        else:
            return f"[{timestamp}] [{self.service_name}] {level}: {message}"


def get_logger(
    service_name: str,
    level: int = logging.INFO,
    use_colors: Optional[bool] = None
) -> logging.Logger:
    """
    Get a configured logger for a service.
    
    Args:
        service_name: Name of the service (e.g., "serverbridge", "inoahbrain")
        level: Logging level (default INFO)
        use_colors: Force color on/off (auto-detects if None)
        
    Returns:
        Configured logger instance
        
    Example:
        logger = get_logger("serverbridge")
        logger.info("Server started on port 8000")
        # Output: [14:32:01] [serverbridge] INFO: Server started on port 8000
    """
    # Create logger with unique name per service
    logger = logging.getLogger(f"inoah.{service_name}")
    
    # Prevent duplicate handlers if called multiple times
    if logger.handlers:
        return logger
    
    logger.setLevel(level)
    
    # Auto-detect color support
    if use_colors is None:
        use_colors = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(ColoredFormatter(service_name, use_colors))
    
    logger.addHandler(console_handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


def log_startup(logger: logging.Logger, service_name: str, port: int):
    """Log standard startup message."""
    logger.info("=" * 50)
    logger.info(f"iNoah {service_name} Starting")
    logger.info(f"Port: {port}")
    logger.info("=" * 50)


def log_shutdown(logger: logging.Logger, service_name: str):
    """Log standard shutdown message."""
    logger.info(f"iNoah {service_name} shutting down...")



