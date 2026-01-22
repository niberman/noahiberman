"""
Hands Client - Interface to ServerBridge
Provides programmatic access to screen control via the serverbridge API.
"""

import os
import sys
import io
import base64
from typing import Optional, Tuple

import requests
from PIL import Image

# Add inoahglobal to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from inoahglobal.shared import get_logger
from inoahglobal.shared.config_loader import get_service_config, get_api_secret

# Logger
logger = get_logger("hands")


class HandsClient:
    """
    Client wrapper for the ServerBridge API.
    Provides methods for screen control and interaction.
    """
    
    def __init__(self, host: Optional[str] = None, port: Optional[int] = None):
        """
        Initialize the HandsClient.
        
        Args:
            host: ServerBridge host (defaults to config)
            port: ServerBridge port (defaults to config)
        """
        config = get_service_config("serverbridge")
        self.host = host or config.get("host", "localhost")
        self.port = port or config.get("port", 8000)
        self.api_secret = get_api_secret()
        
        # Use localhost for client connections
        if self.host == "0.0.0.0":
            self.host = "localhost"
        
        self.base_url = f"http://{self.host}:{self.port}"
        
        logger.info(f"HandsClient initialized: {self.base_url}")
    
    def _get_headers(self) -> dict:
        """Get headers with API key for authenticated requests."""
        return {
            "X-Agent-Key": self.api_secret,
            "Content-Type": "application/json"
        }
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[dict] = None,
        timeout: int = 10
    ) -> dict:
        """
        Make an HTTP request to serverbridge.
        
        Args:
            method: HTTP method (GET, POST)
            endpoint: API endpoint
            json_data: Optional JSON payload
            timeout: Request timeout in seconds
            
        Returns:
            Response JSON
            
        Raises:
            ConnectionError: If serverbridge is unreachable
            RuntimeError: If request fails
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(
                    url,
                    headers=self._get_headers(),
                    timeout=timeout
                )
            else:
                response = requests.post(
                    url,
                    headers=self._get_headers(),
                    json=json_data,
                    timeout=timeout
                )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise RuntimeError(f"ServerBridge error: {response.status_code} - {response.text}")
                
        except requests.exceptions.ConnectionError:
            raise ConnectionError(
                f"Cannot connect to ServerBridge at {self.base_url}. "
                "Ensure serverbridge is running."
            )
        except requests.exceptions.Timeout:
            raise RuntimeError(f"ServerBridge request timed out after {timeout}s")
    
    def is_available(self) -> bool:
        """Check if serverbridge is running and reachable."""
        try:
            response = requests.get(
                f"{self.base_url}/health",
                timeout=3
            )
            return response.status_code == 200
        except:
            return False
    
    def click(self, x: int, y: int) -> dict:
        """
        Click at screen coordinates.
        
        Args:
            x: X coordinate (in half-resolution screen space)
            y: Y coordinate (in half-resolution screen space)
            
        Returns:
            Response with click status
        """
        logger.info(f"Click at ({x}, {y})")
        return self._make_request("POST", "/click", {"x": x, "y": y})
    
    def type_text(self, text: str) -> dict:
        """
        Type text using keyboard simulation.
        Note: Requires serverbridge to implement /type endpoint.
        
        Args:
            text: Text to type
            
        Returns:
            Response with type status
        """
        logger.info(f"Typing: {text[:30]}...")
        return self._make_request("POST", "/type", {"text": text})
    
    def press(self, key: str) -> dict:
        """
        Press a keyboard key.
        Note: Requires serverbridge to implement /press endpoint.
        
        Args:
            key: Key to press (e.g., 'left', 'right', 'enter', 'space')
            
        Returns:
            Response with press status
        """
        logger.info(f"Press key: {key}")
        return self._make_request("POST", "/press", {"key": key})
    
    def hotkey(self, *keys: str) -> dict:
        """
        Press a keyboard hotkey combination.
        Note: Requires serverbridge to implement /hotkey endpoint.
        
        Args:
            *keys: Keys to press together (e.g., 'ctrl', 't')
            
        Returns:
            Response with hotkey status
        """
        logger.info(f"Hotkey: {'+'.join(keys)}")
        return self._make_request("POST", "/hotkey", {"keys": list(keys)})
    
    def get_screenshot(self, as_pil: bool = True) -> Image.Image:
        """
        Get current screenshot from serverbridge video feed.
        
        Args:
            as_pil: Return as PIL Image (True) or bytes (False)
            
        Returns:
            Screenshot as PIL Image or bytes
        """
        logger.info("Getting screenshot...")
        
        # Get a single frame from the video feed
        url = f"{self.base_url}/video_feed?token={self.api_secret}"
        
        try:
            response = requests.get(url, stream=True, timeout=5)
            
            # Read until we get a complete JPEG frame
            bytes_buffer = b''
            for chunk in response.iter_content(chunk_size=1024):
                bytes_buffer += chunk
                
                # Look for JPEG boundaries
                start = bytes_buffer.find(b'\xff\xd8')
                end = bytes_buffer.find(b'\xff\xd9')
                
                if start != -1 and end != -1:
                    # Extract complete JPEG
                    jpg_data = bytes_buffer[start:end + 2]
                    response.close()
                    
                    if as_pil:
                        return Image.open(io.BytesIO(jpg_data))
                    else:
                        return jpg_data
            
            raise RuntimeError("No complete frame received")
            
        except requests.exceptions.ConnectionError:
            raise ConnectionError(f"Cannot connect to ServerBridge at {self.base_url}")
    
    def get_screenshot_base64(self) -> str:
        """
        Get screenshot as base64-encoded string.
        Useful for sending to vision models.
        
        Returns:
            Base64 encoded JPEG string
        """
        img = self.get_screenshot(as_pil=True)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    def execute(self, instruction: str) -> dict:
        """
        Execute a skill/instruction via serverbridge.
        
        Args:
            instruction: Natural language instruction
            
        Returns:
            Execution result
        """
        logger.info(f"Execute: {instruction}")
        return self._make_request("POST", "/execute", {"instruction": instruction})
    
    # =========================================================================
    # BROWSER CONTROL METHODS (Playwright)
    # =========================================================================
    
    def browser_launch(self, url: str = "https://tinder.com", headless: Optional[bool] = None) -> dict:
        """
        Launch the Playwright browser and navigate to URL.
        
        Args:
            url: URL to navigate to
            headless: Override headless setting (None uses config default)
            
        Returns:
            Status dict with launch result
        """
        logger.info(f"Launching browser: {url}")
        payload = {"url": url}
        if headless is not None:
            payload["headless"] = headless
        return self._make_request("POST", "/browser/launch", payload, timeout=60)
    
    def browser_close(self) -> dict:
        """
        Close the Playwright browser.
        
        Returns:
            Status dict
        """
        logger.info("Closing browser")
        return self._make_request("POST", "/browser/close")
    
    def browser_screenshot(self) -> Image.Image:
        """
        Get screenshot from the Playwright browser viewport.
        
        Returns:
            PIL Image of the browser viewport
        """
        logger.info("Getting browser screenshot...")
        
        url = f"{self.base_url}/browser/screenshot"
        
        try:
            response = requests.get(
                url,
                headers=self._get_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                return Image.open(io.BytesIO(response.content))
            else:
                raise RuntimeError(f"Browser screenshot failed: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            raise ConnectionError(f"Cannot connect to ServerBridge at {self.base_url}")
    
    def browser_press(self, key: str, humanize: bool = True) -> dict:
        """
        Press a keyboard key in the browser.
        
        Args:
            key: Key to press (e.g., 'left', 'right', 'enter')
            humanize: If True, add human-like delay
            
        Returns:
            Status dict
        """
        logger.info(f"Browser press: {key}")
        return self._make_request("POST", "/browser/press", {"key": key, "humanize": humanize})
    
    def browser_type(self, text: str, humanize: bool = True) -> dict:
        """
        Type text in the browser with optional human-like delays.
        
        Args:
            text: Text to type
            humanize: If True, add delays between keystrokes
            
        Returns:
            Status dict
        """
        logger.info(f"Browser type: {text[:30]}...")
        return self._make_request("POST", "/browser/type", {"text": text, "humanize": humanize})
    
    def browser_scroll(self, direction: str = "down", amount: int = 300) -> dict:
        """
        Scroll the browser page.
        
        Args:
            direction: "up" or "down"
            amount: Scroll amount in pixels
            
        Returns:
            Status dict
        """
        logger.info(f"Browser scroll: {direction} {amount}px")
        return self._make_request("POST", "/browser/scroll", {"direction": direction, "amount": amount})
    
    def browser_click(self, x: int, y: int) -> dict:
        """
        Click at coordinates in the browser.
        
        Args:
            x: X coordinate
            y: Y coordinate
            
        Returns:
            Status dict
        """
        logger.info(f"Browser click: ({x}, {y})")
        return self._make_request("POST", "/browser/click", {"x": x, "y": y})
    
    def browser_status(self) -> dict:
        """
        Get current browser status.
        
        Returns:
            Status dict with browser state
        """
        return self._make_request("GET", "/browser/status")
    
    def is_browser_running(self) -> bool:
        """Check if the browser is currently running."""
        try:
            status = self.browser_status()
            return status.get("running", False)
        except:
            return False



