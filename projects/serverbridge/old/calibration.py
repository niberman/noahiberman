import pyautogui
import time
import json
import subprocess

CONFIG_FILE = "hinge_smart_config.json"
APP_NAME = "Hinge"

def get_system_window():
    """Ask macOS where it thinks the window is."""
    try:
        script = f'''
        tell application "System Events"
            tell process "{APP_NAME}"
                if exists window 1 then
                    set {{x_pos, y_pos}} to position of window 1
                    set {{w_size, h_size}} to size of window 1
                    return "{{" & x_pos & "," & y_pos & "," & w_size & "," & h_size & "}}"
                end if
            end tell
        end tell
        '''
        result = subprocess.check_output(['osascript', '-e', script]).decode('utf-8').strip()
        parts = result.replace("{", "").replace("}", "").split(",")
        return {
            "left": int(parts[0]), "top": int(parts[1]),
            "width": int(parts[2]), "height": int(parts[3])
        }
    except:
        return None

def calibrate():
    print("--- SMART CALIBRATION (MOVEABLE WINDOWS) ---")
    print("We are measuring the invisible 'Shadow Border'.")
    
    # 1. Get System Coordinates
    sys_win = get_system_window()
    if not sys_win:
        print(f"[!] Could not find '{APP_NAME}'. Open it first!")
        return

    print(f"[*] System sees window at: {sys_win['left']},{sys_win['top']}")

    # 2. Get User Coordinates (Top-Left)
    print("\nSTEP 1: Hover mouse over the VISIBLE Top-Left corner (White part).")
    for i in range(5, 0, -1):
        print(f"Recording in {i}...")
        time.sleep(1)
    user_x1, user_y1 = pyautogui.position()
    
    # 3. Get User Coordinates (Bottom-Right)
    print("\nSTEP 2: Hover mouse over the VISIBLE Bottom-Right corner.")
    for i in range(5, 0, -1):
        print(f"Recording in {i}...")
        time.sleep(1)
    user_x2, user_y2 = pyautogui.position()

    # 4. Calculate Offsets (The "Shadow Tax")
    offset_left = user_x1 - sys_win['left']
    offset_top = user_y1 - sys_win['top']
    
    # Calculate usable width/height
    usable_width = user_x2 - user_x1
    usable_height = user_y2 - user_y1
    
    # Border thickness (difference between system width and usable width)
    padding_x = sys_win['width'] - usable_width
    padding_y = sys_win['height'] - usable_height

    config = {
        "offset_left": offset_left,
        "offset_top": offset_top,
        "padding_x": padding_x,
        "padding_y": padding_y
    }
    
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)
        
    print(f"\n[SUCCESS] Smart Config Saved!")
    print(f"Shadows Detected: Left={offset_left}px, Top={offset_top}px")
    print("You can now move the window anywhere.")

if __name__ == "__main__":
    calibrate()