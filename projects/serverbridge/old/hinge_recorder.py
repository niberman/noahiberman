import time
import os
import mss
from pynput import keyboard
from datetime import datetime

# --- CONFIG ---
DATA_DIR = "./hinge_training_data"
LIKES_DIR = os.path.join(DATA_DIR, "like")
PASSES_DIR = os.path.join(DATA_DIR, "pass")

os.makedirs(LIKES_DIR, exist_ok=True)
os.makedirs(PASSES_DIR, exist_ok=True)

print("[*] Hinge Teacher Active.")
print("[*] Open PlayCover and swipe using ARROW KEYS.")
print("[*] I will capture the screen automatically.")

sct = mss.mss()

def on_release(key):
    try:
        if key == keyboard.Key.esc:
            return False

        action = None
        save_dir = None
        
        if key == keyboard.Key.right:
            action = "like"
            save_dir = LIKES_DIR
        elif key == keyboard.Key.left:
            action = "pass"
            save_dir = PASSES_DIR
        
        if action:
            # Capture Monitor 1 (Change index if needed)
            monitor = sct.monitors[1]
            sct_img = sct.grab(monitor)
            
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.png"
            filepath = os.path.join(save_dir, filename)
            
            mss.tools.to_png(sct_img.rgb, sct_img.size, output=filepath)
            print(f"[TEACHER] Saved {action.upper()} -> {filename}")
            
            # Debounce to prevent double captures
            time.sleep(0.5)

    except Exception as e:
        print(f"Error: {e}")

with keyboard.Listener(on_release=on_release) as listener:
    listener.join()