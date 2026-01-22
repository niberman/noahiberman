import mss
import pyautogui
import time
import json
import os
from datetime import datetime

# --- CONFIG ---
DATA_DIR = "./training_data"
os.makedirs(DATA_DIR, exist_ok=True)

def record_session():
    print("[*] Recording started. Perform your actions now.")
    print("[*] Press Ctrl+C to stop.")
    
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_path = os.path.join(DATA_DIR, session_id)
    os.makedirs(session_path)
    
    logs = []
    sct = mss.mss()
    frame_count = 0

    try:
        while True:
            # 1. Capture Frame
            screenshot = sct.shot(output=f"{session_path}/frame_{frame_count:04d}.png")
            
            # 2. Record Mouse State
            x, y = pyautogui.position()
            # We check if a click happened (requires pynput for better accuracy, 
            # but we'll simplify here)
            
            logs.append({
                "frame": f"frame_{frame_count:04d}.png",
                "mouse_x": x,
                "mouse_y": y,
                "timestamp": time.time()
            })
            
            frame_count += 1
            time.sleep(0.1) # 10 FPS is enough for training
            
    except KeyboardInterrupt:
        with open(os.path.join(session_path, "actions.json"), "w") as f:
            json.dump(logs, f)
        print(f"\n[*] Recording saved to {session_path}")

if __name__ == "__main__":
    record_session()