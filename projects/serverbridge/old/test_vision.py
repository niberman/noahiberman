import pyautogui
import time
import os

# --- CONFIG ---
PASS_IMG = "btn_pass.png"
LIKE_IMG = "btn_like.png"
# --------------

def test_vision():
    print("--- BUTTON RECOGNITION TEST ---")
    
    # 1. Check for files
    if not os.path.exists(PASS_IMG):
        print(f"[!] MISSING: {PASS_IMG}. Please take a screenshot of the 'X' button.")
        return
    if not os.path.exists(LIKE_IMG):
        print(f"[!] MISSING: {LIKE_IMG}. Please take a screenshot of the 'Heart' button.")
        return

    print("Make sure Hinge is visible on screen.")
    print("Searching in 3 seconds...")
    time.sleep(3)

    # 2. Test PASS Button
    print(f"\n[*] Hunting for {PASS_IMG}...")
    try:
        # We use confidence=0.8 if opencv is installed, otherwise exact match
        try:
            import cv2
            conf = 0.8
            print("    (OpenCV detected: Using fuzzy matching)")
        except ImportError:
            conf = None
            print("    (OpenCV NOT detected: Using exact pixel matching)")

        location = pyautogui.locateCenterOnScreen(PASS_IMG, confidence=conf, grayscale=True)
        
        if location:
            print(f"   [SUCCESS] Found PASS at {location}")
            pyautogui.moveTo(location)
        else:
            print("   [FAILED] Could not find PASS button.")
            print("   Try taking a new screenshot that captures LESS background.")

    except Exception as e:
        print(f"   [ERROR] {e}")

    # 3. Test LIKE Button
    print(f"\n[*] Hunting for {LIKE_IMG}...")
    try:
        location = pyautogui.locateCenterOnScreen(LIKE_IMG, confidence=conf, grayscale=True)
        
        if location:
            print(f"   [SUCCESS] Found LIKE at {location}")
            pyautogui.moveTo(location)
        else:
            print("   [FAILED] Could not find LIKE button.")

    except Exception as e:
        print(f"   [ERROR] {e}")

if __name__ == "__main__":
    test_vision()
