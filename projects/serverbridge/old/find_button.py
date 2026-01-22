import cv2
import numpy as np
import mss
from PIL import Image

def find_button(template_path):
    # 1. Load the "Golden Image" you taught it
    template = cv2.imread(template_path, 0)
    w, h = template.shape[::-1]

    # 2. Capture the live screen
    with mss.mss() as sct:
        img = np.array(sct.grab(sct.monitors[1]))
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)

    # 3. Match the pattern
    res = cv2.matchTemplate(gray_img, template, cv2.TM_CCOEFF_NORMED)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

    # Threshold: 0.8 means 80% similarity
    if max_val > 0.8:
        center_x = max_loc[0] + w // 2
        center_y = max_loc[1] + h // 2
        return (center_x, center_y)
    return None