"""
Dating Automator - Core automation logic for dating app swiping.
Uses vision AI to analyze profiles and make swipe decisions.
"""

import sys
import time
import random
from pathlib import Path
from typing import Optional

from PIL import Image

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import (
    get_logger,
    get_config,
    get_identity,
    LLMClient,
)

from browser_controller import get_browser_controller


class DatingAutomator:
    """
    Automates dating app swiping decisions.
    
    Uses vision model to analyze profiles and determine compatibility
    based on the configured identity context and learned preferences.
    """
    
    def __init__(self):
        self.logger = get_logger("dating-automator")
        self.llm = LLMClient()
        
        # Browser controller
        self.browser = get_browser_controller()
        
        # Load identity
        self.identity = get_identity()
        
        # Swipe statistics
        self.stats = {
            "total": 0,
            "liked": 0,
            "passed": 0,
            "errors": 0,
            "session_breaks": 0
        }
        
        # Running state
        self._running = False
        
        # Humanization settings
        self._load_humanize_config()
        
        # Preference context from training
        self._preference_context: Optional[str] = None
        self._load_preference_context()
        
        self.logger.info("DatingAutomator initialized")
    
    def _load_humanize_config(self):
        """Load humanization settings from config."""
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
            from training_loader import get_training_loader
            loader = get_training_loader()
            self._preference_context = loader.get_preference_summary()
            if self._preference_context:
                self.logger.info("Loaded preference context from training data")
        except Exception as e:
            self.logger.debug(f"No preference context available: {e}")
    
    @property
    def is_running(self) -> bool:
        """Check if automation is running."""
        return self._running
    
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
    
    def get_screenshot(self) -> Image.Image:
        """Get screenshot from browser."""
        return self.browser.screenshot()
    
    def get_identity_context(self) -> str:
        """Get formatted identity context string."""
        name = self.identity.get("name", "Noah")
        context = self.identity.get("context", [])
        return f"{name} - {', '.join(context)}"
    
    def analyze_profile(self, screenshot: Image.Image) -> tuple[bool, str]:
        """
        Analyze a dating profile screenshot using vision AI.
        
        Returns:
            Tuple of (is_compatible, reasoning)
        """
        identity_context = self.get_identity_context()
        
        prompt = f"""Analyze this dating profile screenshot.

Is this profile compatible with someone who is: {identity_context}?

Consider:
- Shared interests and lifestyle compatibility
- Communication style indicators
- Red flags or dealbreakers
- Overall match potential"""
        
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
            response = self.llm.vision(prompt, screenshot)
            
            response_upper = response.upper()
            
            if "DECISION: YES" in response_upper or response_upper.startswith("YES"):
                is_compatible = True
            elif "DECISION: NO" in response_upper or response_upper.startswith("NO"):
                is_compatible = False
            else:
                self.logger.warning(f"Unclear response, defaulting to NO: {response[:100]}")
                is_compatible = False
            
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
        self.browser.press("right")
        self.stats["liked"] += 1
        self._swipes_since_break += 1
    
    def swipe_left(self):
        """Execute a left swipe (pass)."""
        self.logger.info("Swiping LEFT (pass)")
        self.browser.press("left")
        self.stats["passed"] += 1
        self._swipes_since_break += 1
    
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
    
    def run_single_swipe(self) -> dict:
        """Run a single swipe cycle with humanized timing."""
        self.stats["total"] += 1
        
        try:
            if self._should_take_break():
                self._take_break()
            
            self.logger.info(f"Swipe #{self.stats['total']} - Getting screenshot...")
            screenshot = self.get_screenshot()
            
            thinking_delay = random.uniform(self.thinking_pause_min, self.thinking_pause_max)
            self.logger.debug(f"Thinking for {thinking_delay:.1f}s...")
            time.sleep(thinking_delay)
            
            self.logger.info("Analyzing profile...")
            is_compatible, reason = self.analyze_profile(screenshot)
            
            if is_compatible:
                time.sleep(random.uniform(0.5, 1.5))
                self.swipe_right()
                decision = "LIKE"
            else:
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
        """Run continuous swiping loop with humanized behavior."""
        self.logger.info("Starting swipe loop...")
        self.reset_stats()
        
        swipe_count = 0
        
        while self._running:
            if max_swipes and swipe_count >= max_swipes:
                self.logger.info(f"Reached max swipes ({max_swipes})")
                break
            
            result = self.run_single_swipe()
            swipe_count += 1
            
            if result["status"] == "error":
                self.logger.warning("Error encountered, waiting before retry...")
                time.sleep(random.uniform(3, 8))
            else:
                delay = random.uniform(self.swipe_delay_min, self.swipe_delay_max)
                self.logger.debug(f"Waiting {delay:.1f}s before next swipe...")
                time.sleep(delay)
        
        self.logger.info(f"Swipe loop ended. Stats: {self.stats}")
        self._running = False
    
    def run(self, max_swipes: Optional[int] = None):
        """
        Main run method.
        
        Args:
            max_swipes: Maximum number of swipes
        """
        self.logger.info("Launching browser...")
        try:
            result = self.browser.launch()
            if result.get("status") == "error":
                return {"status": "error", "message": result.get("message", "Browser launch failed")}
            time.sleep(3)
        except Exception as e:
            self.logger.error(f"Browser launch failed: {e}")
            return {"status": "error", "message": str(e)}
        
        self._running = True
        
        try:
            self.run_swipe_loop(max_swipes)
        finally:
            self._running = False
            self.logger.info("Closing browser...")
            self.browser.close()
        
        return {"status": "completed", "stats": self.stats}
    
    def stop(self) -> dict:
        """Stop the automation."""
        if not self._running:
            return {"status": "not_running"}
        
        self._running = False
        return {"status": "stopping"}
    
    def get_status(self) -> dict:
        """Get current status and statistics."""
        return {
            "running": self._running,
            "browser_launched": self.browser.is_launched,
            "stats": self.stats.copy(),
            "next_break_in": self._next_break_at - self._swipes_since_break,
            "has_preferences": self._preference_context is not None
        }


# Singleton instance
_dating_instance: Optional[DatingAutomator] = None


def get_dating_automator() -> DatingAutomator:
    """Get the singleton DatingAutomator instance."""
    global _dating_instance
    if _dating_instance is None:
        _dating_instance = DatingAutomator()
    return _dating_instance
