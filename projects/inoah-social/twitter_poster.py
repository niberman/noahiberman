"""
Twitter/X Poster - Automated tweet posting with AI content generation.
"""

import sys
import time
from pathlib import Path
from typing import Optional

import httpx

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import (
    get_logger,
    get_service_config,
    get_api_secret,
    get_identity,
    get_style_rules,
    LLMClient,
)


class TwitterPoster:
    """
    Automates Twitter/X posting.
    Generates content using LLM with identity/style rules.
    """
    
    # Platform configurations
    COMPOSE_URL = "https://x.com/compose/tweet"
    
    def __init__(self):
        self.logger = get_logger("twitter-poster")
        self.llm = LLMClient()
        
        # Load identity
        self.identity = get_identity()
        self.style_rules = get_style_rules()
        
        # Post history
        self.history = []
        
        # Running state
        self._running = False
        
        self.logger.info("TwitterPoster initialized")
    
    def _get_hands_client(self) -> tuple[str, dict]:
        """Get the hands service URL and headers."""
        config = get_service_config("inoah-hands")
        port = config.get("port", 8000)
        api_secret = get_api_secret()
        
        base_url = f"http://localhost:{port}"
        headers = {"X-Agent-Key": api_secret}
        
        return base_url, headers
    
    def get_identity_context(self) -> str:
        """Get formatted identity context string."""
        name = self.identity.get("name", "Noah")
        context = self.identity.get("context", [])
        return f"{name} - {', '.join(context)}"
    
    def get_style_prompt(self) -> str:
        """Get style rules as a prompt string."""
        rules = "\n".join(f"- {rule}" for rule in self.style_rules)
        return f"STYLE RULES:\n{rules}"
    
    def generate_tweet(self, topic: str) -> str:
        """Generate a tweet about a topic using the configured voice."""
        identity_context = self.get_identity_context()
        style_rules = self.get_style_prompt()
        
        prompt = f"""Generate a single tweet about: {topic}

IDENTITY: {identity_context}

{style_rules}

ADDITIONAL REQUIREMENTS:
- Maximum 280 characters
- Be direct and opinionated
- No hashtags unless absolutely necessary
- No emojis
- Sound like a real person, not a brand
- Be blunt and confident
- Technical precision when discussing technical topics

Write ONLY the tweet text, nothing else. No quotes around it."""
        
        try:
            tweet = self.llm.generate(prompt)
            
            # Clean up
            tweet = tweet.strip()
            tweet = tweet.strip('"\'')
            
            if len(tweet) > 280:
                tweet = tweet[:277] + "..."
            
            self.logger.info(f"Generated tweet: {tweet}")
            return tweet
            
        except Exception as e:
            self.logger.error(f"Tweet generation failed: {e}")
            raise
    
    def _screen_hotkey(self, *keys):
        """Send hotkey via hands service."""
        base_url, headers = self._get_hands_client()
        headers["Content-Type"] = "application/json"
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/hotkey",
                headers=headers,
                json={"keys": list(keys)}
            )
            return response.json() if response.status_code == 200 else None
    
    def _screen_type(self, text: str):
        """Type text via hands service."""
        base_url, headers = self._get_hands_client()
        headers["Content-Type"] = "application/json"
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/type",
                headers=headers,
                json={"text": text}
            )
            return response.json() if response.status_code == 200 else None
    
    def _screen_press(self, key: str):
        """Press key via hands service."""
        base_url, headers = self._get_hands_client()
        headers["Content-Type"] = "application/json"
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/key",
                headers=headers,
                json={"key": key}
            )
            return response.json() if response.status_code == 200 else None
    
    def open_new_tab(self):
        """Open a new browser tab."""
        self.logger.info("Opening new tab...")
        self._screen_hotkey("ctrl", "t")
        time.sleep(0.5)
    
    def navigate_to_url(self, url: str):
        """Navigate to a URL in the current tab."""
        self.logger.info(f"Navigating to: {url}")
        
        self._screen_hotkey("ctrl", "l")
        time.sleep(0.3)
        
        self._screen_type(url)
        time.sleep(0.2)
        self._screen_press("enter")
        
        time.sleep(3)
    
    def type_and_post(self, text: str):
        """Type text and submit the post."""
        self.logger.info("Typing post content...")
        
        self._screen_type(text)
        time.sleep(0.5)
        
        self.logger.info("Submitting post...")
        self._screen_hotkey("ctrl", "enter")
        time.sleep(2)
    
    def post_to_x(self, topic: str) -> dict:
        """Generate and post a tweet about a topic."""
        self.logger.info(f"Posting to X about: {topic}")
        
        try:
            tweet = self.generate_tweet(topic)
            
            self.open_new_tab()
            self.navigate_to_url(self.COMPOSE_URL)
            self.type_and_post(tweet)
            
            # Record
            record = {
                "platform": "x",
                "topic": topic,
                "content": tweet,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.history.append(record)
            
            self.logger.info("Post submitted successfully")
            
            return {
                "status": "success",
                "platform": "x",
                "topic": topic,
                "content": tweet
            }
            
        except Exception as e:
            self.logger.error(f"Post failed: {e}")
            return {"status": "error", "message": str(e)}
    
    def generate_content_only(self, topic: str) -> dict:
        """Generate content without posting (preview mode)."""
        try:
            content = self.generate_tweet(topic)
            return {
                "status": "success",
                "platform": "twitter",
                "topic": topic,
                "content": content,
                "preview": True
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def run(self, topic: str, preview_only: bool = False) -> dict:
        """Main run method."""
        if preview_only:
            return self.generate_content_only(topic)
        
        self._running = True
        try:
            result = self.post_to_x(topic)
        finally:
            self._running = False
        
        return result
    
    def get_history(self) -> list:
        """Get posting history."""
        return self.history.copy()
    
    def get_status(self) -> dict:
        """Get current status."""
        return {
            "running": self._running,
            "posts_made": len(self.history)
        }


# Singleton instance
_twitter_instance: Optional[TwitterPoster] = None


def get_twitter_poster() -> TwitterPoster:
    """Get the singleton TwitterPoster instance."""
    global _twitter_instance
    if _twitter_instance is None:
        _twitter_instance = TwitterPoster()
    return _twitter_instance
