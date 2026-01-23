"""
Message Responder - AI-powered message responses for Tinder.
Analyzes profiles and conversations to generate personalized replies.
"""

import sys
import json
import time
import random
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass, field

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


@dataclass
class ProfileContext:
    """Extracted profile information."""
    name: str = ""
    age: str = ""
    bio: str = ""
    interests: List[str] = field(default_factory=list)
    job: str = ""
    education: str = ""
    photo_details: List[str] = field(default_factory=list)
    raw_analysis: str = ""


@dataclass
class ConversationContext:
    """Extracted conversation information."""
    their_last_message: str = ""
    topics_discussed: List[str] = field(default_factory=list)
    my_previous_messages: List[str] = field(default_factory=list)
    conversation_tone: str = ""
    questions_asked: List[str] = field(default_factory=list)
    raw_analysis: str = ""


class MessageResponder:
    """
    Handles automated message responses on Tinder.
    
    Analyzes profiles and conversations via vision AI,
    then generates personalized responses matching user's identity and style.
    """
    
    MESSAGES_URL = "https://tinder.com/app/messages"
    
    def __init__(self):
        self.logger = get_logger("message-responder")
        self.llm = LLMClient()
        self.browser = get_browser_controller()
        
        # Load identity and style
        self.identity = get_identity()
        self.style_rules = self._load_style_rules()
        
        # Load messaging config
        self._load_config()
        
        # Statistics
        self.stats = {
            "responses_sent": 0,
            "profiles_analyzed": 0,
            "errors": 0,
            "skipped": 0
        }
        
        # Running state
        self._running = False
        
        self.logger.info("MessageResponder initialized")
    
    def _load_config(self):
        """Load messaging configuration."""
        config = get_config()
        messaging = config.get("dating", {}).get("messaging", {})
        
        self.response_delay_min = messaging.get("response_delay_min_ms", 2000) / 1000.0
        self.response_delay_max = messaging.get("response_delay_max_ms", 8000) / 1000.0
        self.typing_speed_cpm = messaging.get("typing_speed_cpm", 300)
        self.max_response_length = messaging.get("max_response_length", 280)
    
    def _load_style_rules(self) -> str:
        """Load style rules from identity config."""
        rules = self.identity.get("style_rules", [])
        return ", ".join(rules) if rules else "Be natural and conversational"
    
    def get_identity_context(self) -> str:
        """Get formatted identity context string."""
        name = self.identity.get("name", "User")
        context = self.identity.get("context", [])
        return f"{name} - {', '.join(context)}"
    
    @property
    def is_running(self) -> bool:
        """Check if responder is running."""
        return self._running
    
    def reset_stats(self):
        """Reset statistics."""
        self.stats = {
            "responses_sent": 0,
            "profiles_analyzed": 0,
            "errors": 0,
            "skipped": 0
        }
    
    def navigate_to_messages(self) -> bool:
        """Navigate to the messages page."""
        try:
            current_url = self.browser.get_url()
            if current_url and "messages" in current_url:
                self.logger.debug("Already on messages page")
                return True
            
            result = self.browser.navigate(self.MESSAGES_URL)
            if result.get("status") == "error":
                self.logger.error(f"Failed to navigate to messages: {result}")
                return False
            
            time.sleep(2)  # Wait for page to load
            return True
            
        except Exception as e:
            self.logger.error(f"Navigation error: {e}")
            return False
    
    def analyze_profile(self) -> ProfileContext:
        """
        Analyze the current profile by viewing photos and bio.
        
        Returns:
            ProfileContext with extracted information
        """
        profile = ProfileContext()
        
        try:
            self.logger.info("Analyzing profile...")
            self.stats["profiles_analyzed"] += 1
            
            # Take screenshot of current view (should show profile in conversation)
            screenshot = self.browser.screenshot()
            
            # Use vision to analyze the profile
            prompt = """Analyze this Tinder conversation/profile screenshot.
Extract information about the person you're chatting with:
- Their name (shown at top)
- Their age if visible
- Any bio text visible
- Interests or hobbies mentioned
- Job or education if visible
- Notable details from any visible photos (activities, travel, pets, style, etc.)

Reply with ONLY valid JSON in this format:
{
    "name": "their name",
    "age": "age or empty string",
    "bio": "bio text or empty string",
    "interests": ["interest1", "interest2"],
    "job": "job or empty string",
    "education": "education or empty string",
    "photo_details": ["detail1", "detail2"]
}"""
            
            response = self.llm.vision(prompt, screenshot)
            profile.raw_analysis = response
            
            # Parse JSON response
            try:
                # Try to extract JSON from response
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    data = json.loads(json_str)
                    
                    profile.name = data.get("name", "")
                    profile.age = data.get("age", "")
                    profile.bio = data.get("bio", "")
                    profile.interests = data.get("interests", [])
                    profile.job = data.get("job", "")
                    profile.education = data.get("education", "")
                    profile.photo_details = data.get("photo_details", [])
            except json.JSONDecodeError as e:
                self.logger.warning(f"Failed to parse profile JSON: {e}")
            
            self.logger.info(f"Profile analyzed: {profile.name}")
            return profile
            
        except Exception as e:
            self.logger.error(f"Profile analysis failed: {e}")
            return profile
    
    def analyze_conversation(self) -> ConversationContext:
        """
        Analyze the current conversation.
        
        Returns:
            ConversationContext with extracted information
        """
        convo = ConversationContext()
        
        try:
            self.logger.info("Analyzing conversation...")
            
            # Take screenshot of conversation
            screenshot = self.browser.screenshot()
            
            # Use vision to analyze
            prompt = """Analyze this Tinder conversation screenshot.
Extract:
- Their last message (the most recent message from them)
- Key topics that have been discussed
- Your previous messages (messages on the right side)
- The overall tone (flirty, casual, serious, playful, etc.)
- Any questions they asked that need answering

Reply with ONLY valid JSON in this format:
{
    "their_last_message": "their most recent message",
    "topics_discussed": ["topic1", "topic2"],
    "my_previous_messages": ["msg1", "msg2"],
    "conversation_tone": "tone description",
    "questions_asked": ["question1", "question2"]
}"""
            
            response = self.llm.vision(prompt, screenshot)
            convo.raw_analysis = response
            
            # Parse JSON response
            try:
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    data = json.loads(json_str)
                    
                    convo.their_last_message = data.get("their_last_message", "")
                    convo.topics_discussed = data.get("topics_discussed", [])
                    convo.my_previous_messages = data.get("my_previous_messages", [])
                    convo.conversation_tone = data.get("conversation_tone", "")
                    convo.questions_asked = data.get("questions_asked", [])
            except json.JSONDecodeError as e:
                self.logger.warning(f"Failed to parse conversation JSON: {e}")
            
            self.logger.info(f"Conversation analyzed. Last message: {convo.their_last_message[:50]}...")
            return convo
            
        except Exception as e:
            self.logger.error(f"Conversation analysis failed: {e}")
            return convo
    
    def generate_response(self, profile: ProfileContext, convo: ConversationContext) -> str:
        """
        Generate a response based on profile and conversation context.
        
        Args:
            profile: Profile information
            convo: Conversation information
            
        Returns:
            Generated response text
        """
        try:
            self.logger.info("Generating response...")
            
            identity_context = self.get_identity_context()
            
            # Build profile summary
            profile_parts = []
            if profile.bio:
                profile_parts.append(f"Bio: {profile.bio}")
            if profile.job:
                profile_parts.append(f"Works as: {profile.job}")
            if profile.education:
                profile_parts.append(f"Education: {profile.education}")
            if profile.photo_details:
                profile_parts.append(f"From their photos: {', '.join(profile.photo_details)}")
            
            profile_summary = "; ".join(profile_parts) if profile_parts else "No profile details available"
            
            interests_str = ", ".join(profile.interests) if profile.interests else "Unknown"
            
            # Build conversation history
            convo_history = ""
            if convo.my_previous_messages:
                for msg in convo.my_previous_messages[-3:]:  # Last 3 messages
                    convo_history += f"You: {msg}\n"
            if convo.topics_discussed:
                convo_history += f"Topics discussed: {', '.join(convo.topics_discussed)}\n"
            
            prompt = f"""You are {identity_context}.

You're chatting with {profile.name or 'someone'} on Tinder.
Their profile: {profile_summary}
Their interests: {interests_str}

Conversation context:
{convo_history}
Tone so far: {convo.conversation_tone or 'casual'}

Their last message: "{convo.their_last_message}"

{f'Questions they asked: {", ".join(convo.questions_asked)}' if convo.questions_asked else ''}

Generate a natural, engaging reply. If possible, reference something specific from their profile or photos to show genuine interest.

Style rules: {self.style_rules}
Keep it under {self.max_response_length} characters.
Reply with ONLY the message text, nothing else."""
            
            response = self.llm.chat(prompt)
            
            # Clean up response
            response = response.strip().strip('"').strip("'")
            
            # Truncate if too long
            if len(response) > self.max_response_length:
                response = response[:self.max_response_length - 3] + "..."
            
            self.logger.info(f"Generated response: {response[:50]}...")
            return response
            
        except Exception as e:
            self.logger.error(f"Response generation failed: {e}")
            return ""
    
    def send_message(self, text: str) -> bool:
        """
        Type and send a message.
        
        Args:
            text: Message text to send
            
        Returns:
            True if successful
        """
        try:
            self.logger.info(f"Sending message: {text[:30]}...")
            
            # Click on the message input area (Tinder uses a textarea)
            # Try common selectors for the input
            input_selectors = [
                "textarea[placeholder*='message']",
                "textarea[placeholder*='Message']",
                "[data-testid='messageInput']",
                ".messageInput textarea",
                "form textarea",
            ]
            
            clicked = False
            for selector in input_selectors:
                result = self.browser.click(selector)
                if result.get("status") == "clicked":
                    clicked = True
                    break
            
            if not clicked:
                self.logger.warning("Could not find message input, trying to type anyway")
            
            time.sleep(random.uniform(0.3, 0.8))
            
            # Type the message with humanized delays
            self.browser.type_text(text, humanize=True)
            
            time.sleep(random.uniform(0.5, 1.0))
            
            # Press Enter to send
            self.browser.press("enter")
            
            self.stats["responses_sent"] += 1
            self.logger.info("Message sent successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")
            self.stats["errors"] += 1
            return False
    
    def respond_single(self) -> dict:
        """
        Handle responding to a single conversation.
        
        Returns:
            Result dict with status and details
        """
        try:
            # Ensure we're on the messages page
            if not self.navigate_to_messages():
                return {"status": "error", "message": "Failed to navigate to messages"}
            
            time.sleep(random.uniform(1, 2))
            
            # Analyze the profile (from conversation view)
            profile = self.analyze_profile()
            
            time.sleep(random.uniform(0.5, 1.5))
            
            # Analyze the conversation
            convo = self.analyze_conversation()
            
            if not convo.their_last_message:
                self.logger.warning("No message found to respond to")
                self.stats["skipped"] += 1
                return {"status": "skipped", "reason": "No message to respond to"}
            
            time.sleep(random.uniform(self.response_delay_min, self.response_delay_max))
            
            # Generate response
            response = self.generate_response(profile, convo)
            
            if not response:
                self.logger.error("Failed to generate response")
                self.stats["errors"] += 1
                return {"status": "error", "message": "Failed to generate response"}
            
            # Send the message
            if self.send_message(response):
                return {
                    "status": "success",
                    "profile_name": profile.name,
                    "their_message": convo.their_last_message,
                    "our_response": response,
                    "stats": self.stats.copy()
                }
            else:
                return {"status": "error", "message": "Failed to send message"}
                
        except Exception as e:
            self.logger.error(f"respond_single error: {e}")
            self.stats["errors"] += 1
            return {"status": "error", "message": str(e)}
    
    def run(self, max_responses: Optional[int] = None) -> dict:
        """
        Run the message responder loop.
        
        Args:
            max_responses: Maximum number of responses to send (None for unlimited)
            
        Returns:
            Result dict with stats
        """
        self.logger.info("Starting message responder...")
        
        # Launch browser if needed
        if not self.browser.is_launched:
            result = self.browser.launch(self.MESSAGES_URL)
            if result.get("status") == "error":
                return {"status": "error", "message": "Failed to launch browser"}
            time.sleep(3)
        
        self._running = True
        self.reset_stats()
        
        try:
            response_count = 0
            
            while self._running:
                if max_responses and response_count >= max_responses:
                    self.logger.info(f"Reached max responses ({max_responses})")
                    break
                
                result = self.respond_single()
                
                if result["status"] == "success":
                    response_count += 1
                    self.logger.info(f"Response {response_count} sent")
                elif result["status"] == "skipped":
                    self.logger.info("Skipped conversation")
                else:
                    self.logger.warning(f"Response failed: {result.get('message')}")
                
                # Delay before next response
                delay = random.uniform(5, 15)
                self.logger.debug(f"Waiting {delay:.1f}s before next...")
                time.sleep(delay)
            
        finally:
            self._running = False
            self.logger.info(f"Message responder stopped. Stats: {self.stats}")
        
        return {"status": "completed", "stats": self.stats}
    
    def stop(self) -> dict:
        """Stop the responder."""
        if not self._running:
            return {"status": "not_running"}
        
        self._running = False
        return {"status": "stopping"}
    
    def get_status(self) -> dict:
        """Get current status and statistics."""
        return {
            "running": self._running,
            "browser_launched": self.browser.is_launched,
            "stats": self.stats.copy()
        }


# Singleton instance
_responder_instance: Optional[MessageResponder] = None


def get_message_responder() -> MessageResponder:
    """Get the singleton MessageResponder instance."""
    global _responder_instance
    if _responder_instance is None:
        _responder_instance = MessageResponder()
    return _responder_instance
