"""
Instagram Poster - Automated Instagram posting with AI caption generation.
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


class InstagramPoster:
    """
    Automates Instagram photo posting.
    Generates captions using LLM with identity/style rules and optional image analysis.
    """
    
    INSTAGRAM_HOME = "https://www.instagram.com"
    
    def __init__(self):
        self.logger = get_logger("instagram-poster")
        self.llm = LLMClient()
        
        # Load identity
        self.identity = get_identity()
        self.style_rules = get_style_rules()
        
        # Post history
        self.history = []
        
        # Running state
        self._running = False
        
        self.logger.info("InstagramPoster initialized")
    
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
    
    def generate_caption(self, context: str, image_path: Optional[str] = None) -> str:
        """Generate an Instagram caption using the configured voice."""
        identity_context = self.get_identity_context()
        style_rules = self.get_style_prompt()
        
        # Optionally analyze the image first
        visual_facts = ""
        if image_path and Path(image_path).exists():
            try:
                visual_facts = self.llm.vision(
                    "Describe the key elements, setting, and mood of this image briefly.",
                    image_path
                )
                self.logger.info(f"Visual analysis: {visual_facts[:100]}...")
            except Exception as e:
                self.logger.warning(f"Vision analysis failed, continuing without: {e}")
        
        prompt = f"""Generate a single Instagram caption.

USER CONTEXT: {context}
{f'VISUAL ANALYSIS: {visual_facts}' if visual_facts else ''}

IDENTITY: {identity_context}

{style_rules}

ADDITIONAL REQUIREMENTS:
- Write like a human, not a brand
- Be casual and direct
- Use sentence fragments when natural
- No emojis under any circumstances
- No hashtags inline (can add at end if needed)
- No exclamation points
- Sound authentic and confident
- Keep it concise but impactful

Write ONLY the caption text, nothing else. No quotes around it."""
        
        try:
            caption = self.llm.generate(prompt)
            
            # Clean up
            caption = caption.strip()
            caption = caption.strip('"\'')
            
            # Instagram limit
            if len(caption) > 2200:
                caption = caption[:2197] + "..."
            
            self.logger.info(f"Generated caption: {caption[:100]}...")
            return caption
            
        except Exception as e:
            self.logger.error(f"Caption generation failed: {e}")
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
    
    def _screen_click(self, x: int, y: int):
        """Click at coordinates via hands service."""
        base_url, headers = self._get_hands_client()
        headers["Content-Type"] = "application/json"
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/click",
                headers=headers,
                json={"x": x, "y": y}
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
        
        time.sleep(4)
    
    def click_create_button(self):
        """Click the create/new post button on Instagram."""
        self.logger.info("Looking for Create button...")
        time.sleep(1)
        self._screen_click(50, 250)
        time.sleep(2)
    
    def handle_file_dialog(self, file_path: str):
        """Handle the file dialog to select a file."""
        self.logger.info(f"Handling file dialog for: {file_path}")
        time.sleep(1)
        self._screen_type(file_path)
        time.sleep(0.5)
        self._screen_press("enter")
        time.sleep(3)
    
    def click_select_from_computer(self):
        """Click the 'Select from computer' button."""
        self.logger.info("Clicking 'Select from computer'...")
        self._screen_click(960, 540)
        time.sleep(1)
    
    def add_caption_and_share(self, caption: str):
        """Add caption and share the post."""
        self.logger.info("Adding caption...")
        
        # Click Next twice
        time.sleep(2)
        self._screen_click(1800, 50)
        time.sleep(1)
        self._screen_click(1800, 50)
        time.sleep(1)
        
        # Click caption area
        self._screen_click(300, 400)
        time.sleep(0.5)
        
        # Type caption
        self._screen_type(caption)
        time.sleep(0.5)
        
        # Click Share
        self.logger.info("Clicking Share...")
        self._screen_click(1800, 50)
        time.sleep(3)
    
    def post_to_instagram(self, image_path: str, context: str) -> dict:
        """Upload and post an image to Instagram."""
        self.logger.info(f"Posting to Instagram: {image_path}")
        
        if not Path(image_path).exists():
            return {"status": "error", "message": f"Image not found: {image_path}"}
        
        try:
            caption = self.generate_caption(context, image_path)
            
            self.open_new_tab()
            self.navigate_to_url(self.INSTAGRAM_HOME)
            self.click_create_button()
            self.click_select_from_computer()
            
            abs_path = str(Path(image_path).absolute())
            self.handle_file_dialog(abs_path)
            self.add_caption_and_share(caption)
            
            # Record
            record = {
                "platform": "instagram",
                "image": image_path,
                "context": context,
                "caption": caption,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.history.append(record)
            
            self.logger.info("Post submitted successfully")
            
            return {
                "status": "success",
                "platform": "instagram",
                "image": image_path,
                "caption": caption
            }
            
        except Exception as e:
            self.logger.error(f"Post failed: {e}")
            return {"status": "error", "message": str(e)}
    
    def generate_caption_only(self, context: str, image_path: Optional[str] = None) -> dict:
        """Generate caption without posting (preview mode)."""
        try:
            caption = self.generate_caption(context, image_path)
            return {
                "status": "success",
                "platform": "instagram",
                "context": context,
                "caption": caption,
                "preview": True
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def run(self, image_path: str, context: str, preview_only: bool = False) -> dict:
        """Main run method."""
        if preview_only:
            return self.generate_caption_only(context, image_path)
        
        self._running = True
        try:
            result = self.post_to_instagram(image_path, context)
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
_instagram_instance: Optional[InstagramPoster] = None


def get_instagram_poster() -> InstagramPoster:
    """Get the singleton InstagramPoster instance."""
    global _instagram_instance
    if _instagram_instance is None:
        _instagram_instance = InstagramPoster()
    return _instagram_instance
