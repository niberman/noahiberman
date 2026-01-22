"""
Dating Automator Tool
Automates dating app profile swiping using vision AI.
Supports both browser-based (Playwright) and screen-based (pyautogui) modes.
Includes human-like randomization for bot detection avoidance.
"""

import time
import random
import asyncio
from typing import Optional
from PIL import Image

from .base_tool import BaseTool


class DatingAutomator(BaseTool):
    """
    Automates dating app swiping decisions.
    
    Uses vision model to analyze profiles and determine compatibility
    based on the configured identity context and learned preferences.
    
    Modes:
    - browser: Uses Playwright via ServerBridge browser endpoints
    - screen: Uses pyautogui via ServerBridge screen endpoints (legacy)
    """
    
    def __init__(self):
        super().__init__("dating")
        
        # Swipe statistics
        self.stats = {
            "total": 0,
            "liked": 0,
            "passed": 0,
            "errors": 0,
            "session_breaks": 0
        }
        
        # Mode configuration
        self._use_browser = True  # Default to browser mode
        self._browser_launched = False
        
        # Humanization settings (from config, with fallbacks)
        self._load_humanize_config()
        
        # Preference context (loaded from training data if available)
        self._preference_context: Optional[str] = None
        self._load_preference_context()
    
    def _load_humanize_config(self):
        """Load humanization settings from config."""
        from inoahglobal.shared.config_loader import get_config
        config = get_config()
        humanize = config.get("dating", {}).get("humanize", {})
        
        self.swipe_delay_min = humanize.get("swipe_delay_min_ms", 1500) / 1000.0
        self.swipe_delay_max = humanize.get("swipe_delay_max_ms", 8000) / 1000.0
        self.thinking_pause_min = humanize.get("thinking_pause_min_ms", 3000) / 1000.0
        self.thinking_pause_max = humanize.get("thinking_pause_max_ms", 12000) / 1000.0
        
        break_interval = humanize.get("session_break_interval", [15, 25])
        self.break_interval_min = break_interval[0] if isinstance(break_interval, list) else 15
        self.break_interval_max = break_interval[1] if isinstance(break_interval, list) else 25
        
        break_duration = humanize.get("session_break_duration_ms", [30000, 120000])
        self.break_duration_min = (break_duration[0] if isinstance(break_duration, list) else 30000) / 1000.0
        self.break_duration_max = (break_duration[1] if isinstance(break_duration, list) else 120000) / 1000.0
        
        self._swipes_since_break = 0
        self._next_break_at = random.randint(self.break_interval_min, self.break_interval_max)
    
    def _load_preference_context(self):
        """Load preference context from training data analysis."""
        try:
            from .training_loader import get_training_loader
            loader = get_training_loader()
            self._preference_context = loader.get_preference_summary()
            if self._preference_context:
                self.logger.info("Loaded preference context from training data")
        except Exception as e:
            self.logger.debug(f"No preference context available: {e}")
    
    def reset_stats(self):
        """Reset swipe statistics."""
        self.stats = {
            "total": 0,
            "liked": 0,
            "passed": 0,
            "errors": 0,
            "session_breaks": 0
        }
        self._swipes_since_break = 0
        self._next_break_at = random.randint(self.break_interval_min, self.break_interval_max)
    
    def _get_random_delay(self) -> float:
        """Get randomized delay between swipes."""
        return random.uniform(self.swipe_delay_min, self.swipe_delay_max)
    
    def _get_thinking_delay(self) -> float:
        """Get randomized thinking delay."""
        return random.uniform(self.thinking_pause_min, self.thinking_pause_max)
    
    def _get_quick_delay(self) -> float:
        """Get quick delay for obvious decisions."""
        return random.uniform(0.5, 1.5)
    
    def _should_take_break(self) -> bool:
        """Check if a session break is due."""
        return self._swipes_since_break >= self._next_break_at
    
    def _take_break(self):
        """Take a session break to appear more human."""
        break_duration = random.uniform(self.break_duration_min, self.break_duration_max)
        self.logger.info(f"Taking session break: {break_duration:.1f}s")
        time.sleep(break_duration)
        
        self._swipes_since_break = 0
        self._next_break_at = random.randint(self.break_interval_min, self.break_interval_max)
        self.stats["session_breaks"] += 1
    
    def get_screenshot(self) -> Image.Image:
        """
        Get screenshot from appropriate source (browser or screen).
        
        Returns:
            PIL Image
        """
        if self._use_browser:
            return self._get_browser_screenshot()
        else:
            return self.hands.get_screenshot()
    
    def _get_browser_screenshot(self) -> Image.Image:
        """Get screenshot from browser via HTTP API."""
        import requests
        import io
        from inoahglobal.shared.config_loader import get_service_config, get_api_secret
        
        config = get_service_config("serverbridge")
        port = config.get("port", 8000)
        api_secret = get_api_secret()
        
        url = f"http://localhost:{port}/browser/screenshot"
        headers = {"X-Agent-Key": api_secret}
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            raise RuntimeError(f"Browser screenshot failed: {response.status_code}")
        
        return Image.open(io.BytesIO(response.content))
    
    def _browser_press(self, key: str, humanize: bool = True):
        """Send key press to browser via HTTP API."""
        import requests
        from inoahglobal.shared.config_loader import get_service_config, get_api_secret
        
        config = get_service_config("serverbridge")
        port = config.get("port", 8000)
        api_secret = get_api_secret()
        
        url = f"http://localhost:{port}/browser/press"
        headers = {"X-Agent-Key": api_secret, "Content-Type": "application/json"}
        
        response = requests.post(url, headers=headers, json={"key": key, "humanize": humanize}, timeout=10)
        
        if response.status_code != 200:
            raise RuntimeError(f"Browser press failed: {response.status_code}")
        
        return response.json()
    
    def _launch_browser(self, url: str = "https://tinder.com") -> dict:
        """Launch browser via HTTP API."""
        import requests
        from inoahglobal.shared.config_loader import get_service_config, get_api_secret
        
        config = get_service_config("serverbridge")
        port = config.get("port", 8000)
        api_secret = get_api_secret()
        
        browser_url = f"http://localhost:{port}/browser/launch"
        headers = {"X-Agent-Key": api_secret, "Content-Type": "application/json"}
        
        response = requests.post(browser_url, headers=headers, json={"url": url}, timeout=60)
        
        if response.status_code != 200:
            raise RuntimeError(f"Browser launch failed: {response.status_code}")
        
        return response.json()
    
    def _close_browser(self) -> dict:
        """Close browser via HTTP API."""
        import requests
        from inoahglobal.shared.config_loader import get_service_config, get_api_secret
        
        config = get_service_config("serverbridge")
        port = config.get("port", 8000)
        api_secret = get_api_secret()
        
        url = f"http://localhost:{port}/browser/close"
        headers = {"X-Agent-Key": api_secret}
        
        response = requests.post(url, headers=headers, timeout=10)
        return response.json() if response.status_code == 200 else {"status": "error"}
    
    def analyze_profile(self, screenshot: Image.Image) -> tuple[bool, str]:
        """
        Analyze a dating profile screenshot using vision AI.
        
        Args:
            screenshot: PIL Image of the profile
            
        Returns:
            Tuple of (is_compatible, reasoning)
        """
        identity_context = self.get_identity_context()
        
        # Build prompt with optional preference context
        prompt = f"""Analyze this dating profile screenshot.

Is this profile compatible with someone who is: {identity_context}?

Consider:
- Shared interests and lifestyle compatibility
- Communication style indicators
- Red flags or dealbreakers
- Overall match potential"""
        
        # Add learned preferences if available
        if self._preference_context:
            prompt += f"""

LEARNED PREFERENCES (from previous swiping behavior):
{self._preference_context}

Use these preferences to inform your decision."""
        
        prompt += """

Reply with EXACTLY this format:
DECISION: YES or NO
REASON: One sentence explanation

Be selective but reasonable. Look for genuine compatibility signals."""
        
        try:
            response = self.ollama.vision(prompt, screenshot)
            
            # Parse response
            response_upper = response.upper()
            
            if "DECISION: YES" in response_upper or response_upper.startswith("YES"):
                is_compatible = True
            elif "DECISION: NO" in response_upper or response_upper.startswith("NO"):
                is_compatible = False
            else:
                # Default to pass if unclear
                self.logger.warning(f"Unclear response, defaulting to NO: {response[:100]}")
                is_compatible = False
            
            # Extract reasoning
            if "REASON:" in response.upper():
                reason = response.split("REASON:")[-1].strip()
            else:
                reason = response[:100]
            
            return is_compatible, reason
            
        except Exception as e:
            self.logger.error(f"Vision analysis failed: {e}")
            return False, f"Error: {e}"
    
    def swipe_right(self):
        """Execute a right swipe (like)."""
        self.logger.info("Swiping RIGHT (like)")
        
        if self._use_browser:
            self._browser_press("right")
        else:
            self.hands.press("right")
        
        self.stats["liked"] += 1
        self._swipes_since_break += 1
    
    def swipe_left(self):
        """Execute a left swipe (pass)."""
        self.logger.info("Swiping LEFT (pass)")
        
        if self._use_browser:
            self._browser_press("left")
        else:
            self.hands.press("left")
        
        self.stats["passed"] += 1
        self._swipes_since_break += 1
    
    def run_single_swipe(self) -> dict:
        """
        Run a single swipe cycle with humanized timing.
        
        Returns:
            Result dictionary with decision and reasoning
        """
        self.stats["total"] += 1
        
        try:
            # Check for session break
            if self._should_take_break():
                self._take_break()
            
            # Step A: Get screenshot
            self.logger.info(f"Swipe #{self.stats['total']} - Getting screenshot...")
            screenshot = self.get_screenshot()
            
            # Step B: Simulate reading time (random thinking pause)
            thinking_delay = self._get_thinking_delay()
            self.logger.debug(f"Thinking for {thinking_delay:.1f}s...")
            time.sleep(thinking_delay)
            
            # Step C: Analyze with vision model
            self.logger.info("Analyzing profile...")
            is_compatible, reason = self.analyze_profile(screenshot)
            
            # Step D: Execute swipe with appropriate delay
            if is_compatible:
                # Quick decision for likes (shows interest)
                time.sleep(self._get_quick_delay())
                self.swipe_right()
                decision = "LIKE"
            else:
                # Slightly faster for passes
                time.sleep(random.uniform(0.3, 0.8))
                self.swipe_left()
                decision = "PASS"
            
            self.logger.info(f"Decision: {decision} - {reason}")
            
            return {
                "status": "success",
                "decision": decision,
                "reason": reason,
                "stats": self.stats.copy()
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            self.logger.error(f"Swipe error: {e}")
            return {
                "status": "error",
                "message": str(e),
                "stats": self.stats.copy()
            }
    
    def run_swipe_loop(self, max_swipes: Optional[int] = None):
        """
        Run continuous swiping loop with humanized behavior.
        
        Args:
            max_swipes: Maximum number of swipes (None for unlimited)
        """
        self.logger.info("Starting swipe loop...")
        self.reset_stats()
        
        swipe_count = 0
        
        while self._running:
            # Check swipe limit
            if max_swipes and swipe_count >= max_swipes:
                self.logger.info(f"Reached max swipes ({max_swipes})")
                break
            
            # Run single swipe
            result = self.run_single_swipe()
            swipe_count += 1
            
            if result["status"] == "error":
                self.logger.warning("Error encountered, waiting before retry...")
                time.sleep(random.uniform(3, 8))  # Randomized error delay
            else:
                # Wait between swipes (humanized delay)
                delay = self._get_random_delay()
                self.logger.debug(f"Waiting {delay:.1f}s before next swipe...")
                time.sleep(delay)
        
        self.logger.info(f"Swipe loop ended. Stats: {self.stats}")
        self._running = False
    
    def run(self, max_swipes: Optional[int] = None, use_browser: bool = True):
        """
        Main run method.
        
        Args:
            max_swipes: Maximum number of swipes
            use_browser: If True, use Playwright browser; else use screen capture
        """
        self._use_browser = use_browser
        
        # Launch browser if needed
        if use_browser:
            self.logger.info("Launching browser...")
            try:
                result = self._launch_browser()
                if result.get("status") == "error":
                    return {"status": "error", "message": "Browser launch failed"}
                self._browser_launched = True
                
                # Wait for page to fully load
                time.sleep(3)
            except Exception as e:
                self.logger.error(f"Browser launch failed: {e}")
                return {"status": "error", "message": str(e)}
        
        start_result = self.start()
        if start_result["status"] != "started":
            return start_result
        
        try:
            self.run_swipe_loop(max_swipes)
        finally:
            self.stop()
            
            # Close browser if we launched it
            if self._browser_launched:
                self.logger.info("Closing browser...")
                self._close_browser()
                self._browser_launched = False
        
        return {
            "status": "completed",
            "stats": self.stats
        }
    
    def get_status(self) -> dict:
        """Get current status and statistics."""
        return {
            "running": self._running,
            "mode": "browser" if self._use_browser else "screen",
            "browser_launched": self._browser_launched,
            "stats": self.stats.copy(),
            "next_break_in": self._next_break_at - self._swipes_since_break,
            "has_preferences": self._preference_context is not None
        }


# Singleton instance for API access
_dating_instance: Optional[DatingAutomator] = None


def get_dating_automator() -> DatingAutomator:
    """Get the singleton DatingAutomator instance."""
    global _dating_instance
    if _dating_instance is None:
        _dating_instance = DatingAutomator()
    return _dating_instance

