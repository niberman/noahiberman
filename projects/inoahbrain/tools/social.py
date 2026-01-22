"""
Social Poster Tool
Automates social media posting using browser automation.
"""

import time
from typing import Optional

from .base_tool import BaseTool


class SocialPoster(BaseTool):
    """
    Automates social media posting.
    
    Generates content using the text model with style rules,
    then uses browser automation to post.
    """
    
    # Platform configurations
    PLATFORMS = {
        "x": {
            "url": "https://x.com/compose/tweet",
            "name": "X/Twitter"
        },
        "twitter": {
            "url": "https://x.com/compose/tweet",
            "name": "X/Twitter"
        }
    }
    
    def __init__(self):
        super().__init__("social")
        
        # Post history
        self.history = []
    
    def generate_tweet(self, topic: str) -> str:
        """
        Generate a tweet about a topic using Noah's voice.
        
        Args:
            topic: The topic to tweet about
            
        Returns:
            Generated tweet text
        """
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
            tweet = self.ollama.generate(prompt)
            
            # Clean up the response
            tweet = tweet.strip()
            tweet = tweet.strip('"\'')  # Remove quotes if added
            
            # Ensure length limit
            if len(tweet) > 280:
                tweet = tweet[:277] + "..."
            
            self.logger.info(f"Generated tweet: {tweet}")
            return tweet
            
        except Exception as e:
            self.logger.error(f"Tweet generation failed: {e}")
            raise
    
    def open_new_tab(self):
        """Open a new browser tab."""
        self.logger.info("Opening new tab...")
        self.hands.hotkey("ctrl", "t")
        time.sleep(0.5)
    
    def navigate_to_url(self, url: str):
        """Navigate to a URL in the current tab."""
        self.logger.info(f"Navigating to: {url}")
        
        # Select address bar
        self.hands.hotkey("ctrl", "l")
        time.sleep(0.3)
        
        # Type URL and go
        self.hands.type_text(url)
        time.sleep(0.2)
        self.hands.press("enter")
        
        # Wait for page load
        time.sleep(3)
    
    def type_and_post(self, text: str):
        """Type text and submit the post."""
        self.logger.info("Typing post content...")
        
        # Type the tweet
        self.hands.type_text(text)
        time.sleep(0.5)
        
        # Submit with Ctrl+Enter
        self.logger.info("Submitting post...")
        self.hands.hotkey("ctrl", "enter")
        time.sleep(2)
    
    def post_to_x(self, topic: str) -> dict:
        """
        Generate and post a tweet about a topic.
        
        Args:
            topic: The topic to tweet about
            
        Returns:
            Result dictionary
        """
        self.logger.info(f"Posting to X about: {topic}")
        
        try:
            # Step A: Generate the tweet
            tweet = self.generate_tweet(topic)
            
            # Step B: Open browser and navigate
            self.open_new_tab()
            self.navigate_to_url(self.PLATFORMS["x"]["url"])
            
            # Step C: Type and post
            self.type_and_post(tweet)
            
            # Record in history
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
            return {
                "status": "error",
                "message": str(e)
            }
    
    def generate_content_only(self, topic: str, platform: str = "x") -> dict:
        """
        Generate content without posting (preview mode).
        
        Args:
            topic: The topic to write about
            platform: Target platform
            
        Returns:
            Generated content
        """
        try:
            content = self.generate_tweet(topic)
            return {
                "status": "success",
                "platform": platform,
                "topic": topic,
                "content": content,
                "preview": True
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    def run(self, topic: str, platform: str = "x", preview_only: bool = False) -> dict:
        """
        Main run method.
        
        Args:
            topic: Topic to post about
            platform: Target platform
            preview_only: If True, only generate content without posting
            
        Returns:
            Result dictionary
        """
        if preview_only:
            return self.generate_content_only(topic, platform)
        
        start_result = self.start()
        if start_result["status"] != "started":
            return start_result
        
        try:
            if platform in ["x", "twitter"]:
                result = self.post_to_x(topic)
            else:
                result = {
                    "status": "error",
                    "message": f"Unknown platform: {platform}"
                }
        finally:
            self.stop()
        
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


# Singleton instance for API access
_social_instance: Optional[SocialPoster] = None


def get_social_poster() -> SocialPoster:
    """Get the singleton SocialPoster instance."""
    global _social_instance
    if _social_instance is None:
        _social_instance = SocialPoster()
    return _social_instance



