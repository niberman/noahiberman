import pyautogui
import time
import os

# --- CONFIG ---
PASS_IMG = "btn_pass.png"
SCALING_FACTOR = 2  # Tune this for Retina displays (try 1, 2, or 2.5)
# --------------

def run_task(instruction):
    """
    This function is called by main.py.
    You can edit this file while the server is running.
    """
    print(f"[*] Skill triggered: {instruction}")
    
    if "pass" in instruction:
        return find_and_click(PASS_IMG)
        
    return {"status": "no action defined"}

def find_and_click(image_path):
    # 1. Check if file exists
    if not os.path.exists(image_path):
        print(f"[!] ERROR: Image file '{image_path}' not found.")
        return {"error": "missing_image_file"}

    print(f"[*] Scanning for {image_path}...")
    
    try:
        # 2. LOCATE
        # grayscale=True is faster. confidence=0.8 requires OpenCV.
        # If you don't have OpenCV installed, remove 'confidence=0.8'.
        location = pyautogui.locateCenterOnScreen(
            image_path, 
            confidence=0.8, 
            grayscale=True
        )
        
        if location:
            print(f"   > FOUND at {location}")
            print(f"   > RAW coords:    ({location.x}, {location.y})")
            
            # 3. MOVE & CLICK
            # Divide by SCALING_FACTOR for Mac Retina screens (high density)
            x, y = location.x / SCALING_FACTOR, location.y / SCALING_FACTOR
            
            print(f"   > SCALED coords: ({x}, {y})  [factor: {SCALING_FACTOR}]")
            
            pyautogui.moveTo(x, y, duration=0.2)
            pyautogui.click()
            return {"status": "clicked", "location": [x, y]}
            
        else:
            print("   [!] Button not visible on screen.")
            return {"error": "not_found"}

    except Exception as e:
        print(f"   [!] Vision Error: {e}")
        return {"error": str(e)}