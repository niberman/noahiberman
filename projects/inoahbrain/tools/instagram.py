"""
Instagram Poster Tool
Automates Instagram photo posting using browser automation.
"""

import time
from pathlib import Path
from typing import Optional

from .base_tool import BaseTool


class InstagramPoster(BaseTool):
    """
    Automates Instagram photo posting.
    
    Uploads an image, generates a caption using the text model with style rules,
    then uses browser automation to post.
    """
    
    # Instagram URLs
    INSTAGRAM_HOME = "https://www.instagram.com"
    
    def __init__(self):
        super().__init__("instagram")
        
        # Post history
        self.history = []
    
    def generate_caption(self, context: str, image_path: Optional[str] = None) -> str:
        """
        Generate an Instagram caption using Noah's voice.
        
        Args:
            context: User-provided context about the photo
            image_path: Optional path to analyze the image
            
        Returns:
            Generated caption text
        """
        identity_context = self.get_identity_context()
        style_rules = self.get_style_prompt()
        
        # Optionally analyze the image first
        visual_facts = ""
        if image_path and Path(image_path).exists():
            try:
                visual_facts = self.ollama.vision(
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
            caption = self.ollama.generate(prompt)
            
            # Clean up the response
            caption = caption.strip()
            caption = caption.strip('"\'')  # Remove quotes if added
            
            # Instagram limit is 2200 chars
            if len(caption) > 2200:
                caption = caption[:2197] + "..."
            
            self.logger.info(f"Generated caption: {caption[:100]}...")
            return caption
            
        except Exception as e:
            self.logger.error(f"Caption generation failed: {e}")
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
        time.sleep(4)
    
    def click_create_button(self):
        """Click the create/new post button on Instagram."""
        self.logger.info("Looking for Create button...")
        
        # Instagram's create button is typically in the left sidebar
        # We'll use keyboard shortcut or click coordinates
        # On Instagram web, we can use the "New post" option from sidebar
        
        # Try clicking the + icon (create button) - usually in left sidebar
        # Position varies, so we'll try keyboard navigation first
        time.sleep(1)
        
        # Tab through to find create button, or use direct click
        # Instagram create button is usually accessible via the sidebar
        # We'll click roughly where it should be in the left sidebar
        self.hands.click(50, 250)  # Approximate position for create button
        time.sleep(2)
    
    def handle_file_dialog(self, file_path: str):
        """
        Handle the Windows file dialog to select a file.
        
        Args:
            file_path: Absolute path to the file to upload
        """
        self.logger.info(f"Handling file dialog for: {file_path}")
        
        # Wait for dialog to open
        time.sleep(1)
        
        # The file dialog should be focused
        # Type the full path directly
        self.hands.type_text(file_path)
        time.sleep(0.5)
        
        # Press Enter to confirm selection
        self.hands.press("enter")
        time.sleep(3)  # Wait for upload
    
    def click_select_from_computer(self):
        """Click the 'Select from computer' button in Instagram's upload dialog."""
        self.logger.info("Clicking 'Select from computer'...")
        
        # This button appears in the center of the modal
        # We'll click the center of the screen where it typically appears
        self.hands.click(960, 540)  # Center of 1920x1080 screen
        time.sleep(1)
    
    def add_caption_and_share(self, caption: str):
        """
        Add caption and share the post.
        
        Args:
            caption: The caption text to add
        """
        self.logger.info("Adding caption...")
        
        # After image is loaded, we need to click Next twice
        # First Next: takes us from crop to filters
        # Second Next: takes us to caption/share
        
        # Click Next (usually top right)
        time.sleep(2)
        self.hands.click(1800, 50)  # Top right area for Next button
        time.sleep(1)
        
        # Click Next again
        self.hands.click(1800, 50)
        time.sleep(1)
        
        # Now we should be on the caption screen
        # Click in the caption area (usually left side)
        self.hands.click(300, 400)
        time.sleep(0.5)
        
        # Type the caption
        self.hands.type_text(caption)
        time.sleep(0.5)
        
        # Click Share button (top right)
        self.logger.info("Clicking Share...")
        self.hands.click(1800, 50)
        time.sleep(3)  # Wait for post to complete
    
    def post_to_instagram(self, image_path: str, context: str) -> dict:
        """
        Upload and post an image to Instagram.
        
        Args:
            image_path: Path to the image file
            context: Context for caption generation
            
        Returns:
            Result dictionary
        """
        self.logger.info(f"Posting to Instagram: {image_path}")
        
        # Validate image exists
        if not Path(image_path).exists():
            return {
                "status": "error",
                "message": f"Image not found: {image_path}"
            }
        
        try:
            # Step 1: Generate caption
            caption = self.generate_caption(context, image_path)
            
            # Step 2: Open Instagram
            self.open_new_tab()
            self.navigate_to_url(self.INSTAGRAM_HOME)
            
            # Step 3: Click create/new post
            self.click_create_button()
            
            # Step 4: Click "Select from computer"
            self.click_select_from_computer()
            
            # Step 5: Handle file dialog
            abs_path = str(Path(image_path).absolute())
            self.handle_file_dialog(abs_path)
            
            # Step 6: Add caption and share
            self.add_caption_and_share(caption)
            
            # Record in history
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
            return {
                "status": "error",
                "message": str(e)
            }
    
    def generate_caption_only(self, context: str, image_path: Optional[str] = None) -> dict:
        """
        Generate caption without posting (preview mode).
        
        Args:
            context: Context for the caption
            image_path: Optional image path for analysis
            
        Returns:
            Generated caption
        """
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
            return {
                "status": "error",
                "message": str(e)
            }
    
    def run(
        self,
        image_path: str,
        context: str,
        preview_only: bool = False
    ) -> dict:
        """
        Main run method.
        
        Args:
            image_path: Path to the image to post
            context: Context for caption generation
            preview_only: If True, only generate caption without posting
            
        Returns:
            Result dictionary
        """
        if preview_only:
            return self.generate_caption_only(context, image_path)
        
        start_result = self.start()
        if start_result["status"] != "started":
            return start_result
        
        try:
            result = self.post_to_instagram(image_path, context)
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
_instagram_instance: Optional[InstagramPoster] = None


def get_instagram_poster() -> InstagramPoster:
    """Get the singleton InstagramPoster instance."""
    global _instagram_instance
    if _instagram_instance is None:
        _instagram_instance = InstagramPoster()
    return _instagram_instance





