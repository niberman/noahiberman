"""
Browser Controller - Playwright-based browser automation for dating apps.
Handles browser lifecycle, screenshots, and keyboard input.
"""

import sys
import io
import time
import random
from pathlib import Path
from typing import Optional

from PIL import Image
from playwright.sync_api import sync_playwright, Playwright, Browser, BrowserContext, Page

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import get_logger, get_config


class BrowserController:
    """
    Controls a Playwright browser instance for dating app automation.
    
    Uses persistent context to preserve login sessions between runs.
    """
    
    def __init__(self):
        self.logger = get_logger("browser-controller")
        
        # Playwright objects
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        
        # Load config
        self._load_config()
        
        self.logger.info("BrowserController initialized")
    
    def _load_config(self):
        """Load browser configuration from config.json."""
        config = get_config()
        browser_config = config.get("browser", {})
        
        self.headless = browser_config.get("headless", False)
        self.user_data_dir = browser_config.get("user_data_dir", "./browser_data")
        self.viewport = browser_config.get("viewport", {"width": 1920, "height": 1080})
        self.slow_mo = browser_config.get("slow_mo", 100)
        
        # Resolve user_data_dir relative to this file's directory
        user_data_path = Path(self.user_data_dir)
        if not user_data_path.is_absolute():
            user_data_path = Path(__file__).parent / user_data_path
        self.user_data_dir = str(user_data_path.resolve())
        
        self.logger.debug(f"Browser config: headless={self.headless}, user_data_dir={self.user_data_dir}")
    
    @property
    def is_launched(self) -> bool:
        """Check if browser is currently launched."""
        return self._page is not None and not self._page.is_closed()
    
    def launch(self, url: str = "https://tinder.com") -> dict:
        """
        Launch browser and navigate to URL.
        
        Uses persistent context to preserve login sessions.
        
        Args:
            url: URL to navigate to (default: tinder.com)
            
        Returns:
            Status dict with launch result
        """
        if self.is_launched:
            self.logger.warning("Browser already launched")
            return {"status": "already_launched", "url": self._page.url}
        
        try:
            self.logger.info(f"Launching browser to {url}...")
            
            # Ensure user data directory exists
            Path(self.user_data_dir).mkdir(parents=True, exist_ok=True)
            
            # Start Playwright
            self._playwright = sync_playwright().start()
            
            # Launch with persistent context (preserves cookies/login)
            self._context = self._playwright.chromium.launch_persistent_context(
                user_data_dir=self.user_data_dir,
                headless=self.headless,
                viewport=self.viewport,
                slow_mo=self.slow_mo,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                ]
            )
            
            # Get or create page
            if self._context.pages:
                self._page = self._context.pages[0]
            else:
                self._page = self._context.new_page()
            
            # Navigate to URL
            self._page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            self.logger.info(f"Browser launched successfully: {self._page.url}")
            
            return {
                "status": "launched",
                "url": self._page.url,
                "viewport": self.viewport
            }
            
        except Exception as e:
            self.logger.error(f"Browser launch failed: {e}")
            self.close()
            return {"status": "error", "message": str(e)}
    
    def screenshot(self) -> Image.Image:
        """
        Take a screenshot of the current page.
        
        Returns:
            PIL Image of the screenshot
            
        Raises:
            RuntimeError: If browser is not launched
        """
        if not self.is_launched:
            raise RuntimeError("Browser not launched")
        
        try:
            # Take screenshot as bytes
            screenshot_bytes = self._page.screenshot(type="png")
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(screenshot_bytes))
            
            self.logger.debug(f"Screenshot taken: {image.size}")
            return image
            
        except Exception as e:
            self.logger.error(f"Screenshot failed: {e}")
            raise RuntimeError(f"Screenshot failed: {e}")
    
    def press(self, key: str, humanize: bool = True):
        """
        Press a key on the page.
        
        Args:
            key: Key to press (e.g., "left", "right", "enter")
            humanize: If True, add random delays to appear more human
            
        Raises:
            RuntimeError: If browser is not launched
        """
        if not self.is_launched:
            raise RuntimeError("Browser not launched")
        
        try:
            # Map common key names to Playwright format
            key_map = {
                "left": "ArrowLeft",
                "right": "ArrowRight",
                "up": "ArrowUp",
                "down": "ArrowDown",
                "enter": "Enter",
                "escape": "Escape",
                "space": " ",
                "tab": "Tab",
                "backspace": "Backspace",
            }
            
            playwright_key = key_map.get(key.lower(), key)
            
            if humanize:
                # Random delay before pressing (50-200ms)
                time.sleep(random.uniform(0.05, 0.2))
            
            self._page.keyboard.press(playwright_key)
            
            if humanize:
                # Random delay after pressing (100-300ms)
                time.sleep(random.uniform(0.1, 0.3))
            
            self.logger.debug(f"Pressed key: {key} -> {playwright_key}")
            
        except Exception as e:
            self.logger.error(f"Key press failed: {e}")
            raise RuntimeError(f"Key press failed: {e}")
    
    def navigate(self, url: str) -> dict:
        """
        Navigate to a URL.
        
        Args:
            url: URL to navigate to
            
        Returns:
            Status dict with navigation result
        """
        if not self.is_launched:
            raise RuntimeError("Browser not launched")
        
        try:
            self.logger.info(f"Navigating to {url}...")
            self._page.goto(url, wait_until="domcontentloaded", timeout=60000)
            self.logger.info(f"Navigated to: {self._page.url}")
            return {"status": "navigated", "url": self._page.url}
        except Exception as e:
            self.logger.error(f"Navigation failed: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_url(self) -> str:
        """
        Get the current page URL.
        
        Returns:
            Current URL string
        """
        if not self.is_launched:
            return None
        return self._page.url
    
    def type_text(self, text: str, humanize: bool = True):
        """
        Type text with human-like delays.
        
        Args:
            text: Text to type
            humanize: If True, add random delays between characters
            
        Raises:
            RuntimeError: If browser is not launched
        """
        if not self.is_launched:
            raise RuntimeError("Browser not launched")
        
        try:
            if humanize:
                # Type character by character with random delays
                for char in text:
                    self._page.keyboard.type(char)
                    # Random delay between 30-150ms per character (200-400 CPM)
                    time.sleep(random.uniform(0.03, 0.15))
            else:
                self._page.keyboard.type(text)
            
            self.logger.debug(f"Typed {len(text)} characters")
            
        except Exception as e:
            self.logger.error(f"Typing failed: {e}")
            raise RuntimeError(f"Typing failed: {e}")
    
    def click(self, selector: str, humanize: bool = True) -> dict:
        """
        Click an element by CSS selector.
        
        Args:
            selector: CSS selector for element to click
            humanize: If True, add random delays
            
        Returns:
            Status dict
        """
        if not self.is_launched:
            raise RuntimeError("Browser not launched")
        
        try:
            if humanize:
                time.sleep(random.uniform(0.1, 0.3))
            
            self._page.click(selector, timeout=10000)
            
            if humanize:
                time.sleep(random.uniform(0.2, 0.5))
            
            self.logger.debug(f"Clicked: {selector}")
            return {"status": "clicked", "selector": selector}
            
        except Exception as e:
            self.logger.error(f"Click failed for {selector}: {e}")
            return {"status": "error", "selector": selector, "message": str(e)}
    
    def click_coordinates(self, x: int, y: int, humanize: bool = True) -> dict:
        """
        Click at specific coordinates.
        
        Args:
            x: X coordinate
            y: Y coordinate
            humanize: If True, add random delays
            
        Returns:
            Status dict
        """
        if not self.is_launched:
            raise RuntimeError("Browser not launched")
        
        try:
            if humanize:
                time.sleep(random.uniform(0.1, 0.3))
            
            self._page.mouse.click(x, y)
            
            if humanize:
                time.sleep(random.uniform(0.2, 0.5))
            
            self.logger.debug(f"Clicked at: ({x}, {y})")
            return {"status": "clicked", "x": x, "y": y}
            
        except Exception as e:
            self.logger.error(f"Click failed at ({x}, {y}): {e}")
            return {"status": "error", "x": x, "y": y, "message": str(e)}
    
    def wait_for_selector(self, selector: str, timeout: int = 10000) -> bool:
        """
        Wait for an element to appear.
        
        Args:
            selector: CSS selector to wait for
            timeout: Timeout in milliseconds
            
        Returns:
            True if element found, False otherwise
        """
        if not self.is_launched:
            return False
        
        try:
            self._page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception:
            return False
    
    def close(self) -> dict:
        """
        Close the browser and clean up resources.
        
        Returns:
            Status dict
        """
        try:
            if self._context:
                self._context.close()
                self._context = None
            
            if self._playwright:
                self._playwright.stop()
                self._playwright = None
            
            self._page = None
            self._browser = None
            
            self.logger.info("Browser closed")
            return {"status": "closed"}
            
        except Exception as e:
            self.logger.error(f"Error closing browser: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_status(self) -> dict:
        """Get current browser status."""
        return {
            "launched": self.is_launched,
            "url": self._page.url if self.is_launched else None,
            "headless": self.headless,
            "viewport": self.viewport
        }


# Singleton instance
_browser_instance: Optional[BrowserController] = None


def get_browser_controller() -> BrowserController:
    """Get the singleton BrowserController instance."""
    global _browser_instance
    if _browser_instance is None:
        _browser_instance = BrowserController()
    return _browser_instance
