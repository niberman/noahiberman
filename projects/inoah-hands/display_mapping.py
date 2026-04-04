"""
Map mss physical pixels and stream image coordinates to PyAutoGUI space.

On macOS Retina displays, mss captures at backing-store resolution while
PyAutoGUI uses logical points. We derive scale from the primary monitor
so clicks from the streamed (logical-sized) image line up with pyautogui.
"""


def monitor_logical_size(mon: dict, scale: float) -> tuple[int, int]:
    if scale <= 0:
        scale = 1.0
    return max(1, round(mon["width"] / scale)), max(1, round(mon["height"] / scale))


def stream_coords_to_global(x: int, y: int, mon: dict, scale: float) -> tuple[int, int]:
    """Convert click position on the logical-sized stream to global PyAutoGUI coordinates."""
    if scale <= 0:
        scale = 1.0
    gx = int(round(mon["left"] / scale + x))
    gy = int(round(mon["top"] / scale + y))
    return gx, gy
