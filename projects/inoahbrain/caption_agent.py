"""
Caption Agent - CLI tool for interactive caption generation.
Uses the iNoahBrain service or runs standalone.
"""

import os
import sys
import glob
from pathlib import Path

# Add inoahglobal to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from inoahglobal.shared import OllamaClient, get_logger
from inoahglobal.shared.config_loader import get_path, get_identity, get_style_rules

# Logger and Ollama client
logger = get_logger("caption_agent")
ollama = OllamaClient()


def generate_caption():
    """Interactive caption generation from command line."""
    
    # 1. Find the latest photo
    output_dir = get_path("photo_output")
    
    if not output_dir.exists():
        logger.error(f"Output directory not found: {output_dir}")
        return
    
    files = list(output_dir.glob("*"))
    image_files = [f for f in files if f.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}]
    
    if not image_files:
        logger.error(f"No photos found in {output_dir}")
        return
        
    latest_photo = max(image_files, key=lambda f: f.stat().st_mtime)
    filename = latest_photo.name
    
    print(f"\n[*] Loaded latest asset: {filename}")
    
    # 2. Get user context
    print("-" * 50)
    user_context = input("ENTER DETAILS (Where were you? What happened?): ")
    print("-" * 50)

    # 3. Vision analysis
    print("   [1/2] Scanning image structure...")
    try:
        visual_facts = ollama.vision(
            "Describe the technical setting, lighting, and key objects in this image. Keep it brief and objective.",
            latest_photo
        )
    except Exception as e:
        logger.error(f"Vision error: {e}")
        print(f"   [!] Vision failed: {e}")
        return

    # 4. Generate captions
    print("   [2/2] Drafting options...")
    
    identity = get_identity()
    style_rules = get_style_rules()
    style_rules_text = "\n".join(f"- {rule}" for rule in style_rules)
    
    prompt = f"""
    USER NOTES: "{user_context}"
    VISUAL FACTS: "{visual_facts}"
    
    TASK: Rewrite these notes into 3 Instagram captions.
    
    IDENTITY CONTEXT: {identity.get('name', 'Noah')} - {', '.join(identity.get('context', []))}
    
    STYLE GUIDE:
    - Write like a human, not a corporation.
    - Be casual and direct. 
    - Use sentence fragments. It's okay to drop pronouns.
    {style_rules_text}
    
    Option 1: The Logbook (Short, factual, just the cool details)
    Option 2: The Story (Conversational, exactly how you'd say it to a friend)
    Option 3: The Vibe (One short line. Abstract.)
    
    STRICT RULES:
    - ABSOLUTELY NO EMOJIS.
    - No exclamation points.
    - No hashtags inline.
    - Tone: Professional, high-status, blunt.
    """
    
    try:
        captions = ollama.generate(prompt)
    except Exception as e:
        logger.error(f"Generation error: {e}")
        print(f"   [!] Caption generation failed: {e}")
        return
    
    print("\n=== CAPTION OPTIONS ===\n")
    print(captions)
    print("\n=======================\n")


if __name__ == "__main__":
    generate_caption()
