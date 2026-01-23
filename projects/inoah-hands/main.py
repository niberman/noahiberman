"""
iNoah Hands - The Hands
Low-level desktop interaction: screenshots, clicks, keyboard input.
"""

import io
import sys
import mss
import pyautogui
import time
import base64
import json
import uuid
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager

from PIL import Image, ImageDraw
from fastapi import FastAPI, HTTPException, Security
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import get_logger, get_service_config, get_api_secret

# Service configuration
SERVICE_NAME = "inoah-hands"
service_config = get_service_config(SERVICE_NAME)
PORT = service_config.get("port", 8000)
MONITOR_INDEX = service_config.get("monitor_index", 1)

# Setup
logger = get_logger(SERVICE_NAME)
api_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)
API_SECRET = get_api_secret()

# Recording state
RECORDINGS_DIR = Path(__file__).parent / "recordings"
RECORDINGS_DIR.mkdir(exist_ok=True)

sct = mss.mss()

recording_session = {
    "active": False,
    "events": [],
    "session_id": None,
    "task_prompt": None,
    "coordinate_system": None,
    "event_counter": 0
}


# Helper functions
def get_coordinate_system():
    """Get current screen coordinate system for cross-platform compatibility."""
    try:
        monitor = sct.monitors[MONITOR_INDEX]
    except IndexError:
        monitor = sct.monitors[1]
    
    physical_width = monitor["width"]
    physical_height = monitor["height"]
    
    # Logical dimensions (what pyautogui uses on Retina)
    logical_width = physical_width // 2
    logical_height = physical_height // 2
    
    return {
        "width": logical_width,
        "height": logical_height,
        "scale_factor": 2
    }


def capture_screenshot(save_path=None):
    """Capture screenshot, optionally save to file, return base64 or path."""
    try:
        monitor = sct.monitors[MONITOR_INDEX]
    except IndexError:
        monitor = sct.monitors[1]
    
    sct_img = sct.grab(monitor)
    img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
    img = img.resize((img.width // 2, img.height // 2))
    
    if save_path:
        img.save(save_path, format="JPEG", quality=50)
        return str(save_path)
    else:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=50)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")


def record_event(action: str, params: dict):
    """Record an event if recording is active."""
    if not recording_session["active"]:
        return None
    
    session_id = recording_session["session_id"]
    session_dir = RECORDINGS_DIR / session_id
    counter = recording_session["event_counter"]
    recording_session["event_counter"] += 1
    
    before_path = session_dir / f"{counter:03d}_before.jpg"
    capture_screenshot(before_path)
    
    event = {
        "session_id": session_id,
        "task_prompt": recording_session["task_prompt"],
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "action": action,
        "coordinate_system": recording_session["coordinate_system"],
        "params": params,
        "before_screenshot": str(before_path),
        "after_screenshot": None
    }
    
    return event, counter


def finalize_event(event, counter):
    """Capture after screenshot and save event."""
    if event is None:
        return
    
    session_id = recording_session["session_id"]
    session_dir = RECORDINGS_DIR / session_id
    
    time.sleep(0.1)
    
    after_path = session_dir / f"{counter:03d}_after.jpg"
    capture_screenshot(after_path)
    event["after_screenshot"] = str(after_path)
    
    jsonl_path = session_dir / "recording.jsonl"
    with open(jsonl_path, "a") as f:
        f.write(json.dumps(event) + "\n")
    
    recording_session["events"].append(event)


# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info(f"iNoah Hands (The Hands) Starting")
    logger.info(f"Port: {PORT}")
    logger.info(f"Monitor: {MONITOR_INDEX}")
    logger.info("=" * 50)
    yield
    logger.info("iNoah Hands shutting down...")


# FastAPI App
app = FastAPI(
    title="iNoah Hands",
    description="The Hands - Desktop interaction service",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Video stream generator
def generate_stream():
    while True:
        try:
            try:
                monitor = sct.monitors[MONITOR_INDEX]
            except IndexError:
                monitor = sct.monitors[1]
            
            sct_img = sct.grab(monitor)
            img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
            img = img.resize((int(img.width / 2), int(img.height / 2)))
            
            draw = ImageDraw.Draw(img)
            t = time.strftime("%H:%M:%S")
            draw.text((10, 10), f"LIVE: {t}", fill="red")
            
            frame = io.BytesIO()
            img.save(frame, format="JPEG", quality=50)
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame.getvalue() + b'\r\n')
            time.sleep(0.1)
        except Exception:
            time.sleep(1)


# =============================================================================
# Dashboard
# =============================================================================

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Web dashboard for manual control."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>iNoah Hands</title>
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{ 
                background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
                color: #e0e0e0;
                font-family: 'SF Mono', 'Fira Code', monospace;
                min-height: 100vh;
                padding: 12px;
            }}
            .container {{ max-width: 500px; margin: 0 auto; }}
            h1 {{ 
                font-size: 14px;
                color: #8b5cf6;
                text-transform: uppercase;
                letter-spacing: 3px;
                margin-bottom: 12px;
            }}
            .video-container {{
                position: relative;
                border: 2px solid #333;
                border-radius: 8px;
                overflow: hidden;
                cursor: crosshair;
            }}
            .video-container img {{ width: 100%; display: block; }}
            .controls {{ margin-top: 12px; }}
            .btn-row {{ display: flex; gap: 6px; margin-bottom: 8px; }}
            .btn {{
                flex: 1;
                padding: 12px 8px;
                border: none;
                border-radius: 6px;
                font-family: inherit;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                background: #8b5cf6;
                color: white;
            }}
            .btn:hover {{ opacity: 0.9; }}
            .key-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }}
            .key-btn {{
                padding: 10px 4px;
                background: #1e1e2e;
                border: 1px solid #333;
                border-radius: 4px;
                color: #888;
                font-size: 10px;
                cursor: pointer;
            }}
            .key-btn:hover {{ background: #2a2a3e; color: #fff; }}
            .input-row {{ display: flex; gap: 6px; margin-bottom: 8px; }}
            .text-input {{
                flex: 1;
                padding: 10px;
                background: #1e1e2e;
                border: 1px solid #333;
                border-radius: 6px;
                color: #fff;
                font-family: inherit;
            }}
            .text-input:focus {{ outline: none; border-color: #8b5cf6; }}
            .section-label {{
                font-size: 9px;
                color: #555;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin: 12px 0 6px 0;
            }}
            .log {{
                margin-top: 12px;
                padding: 10px;
                background: #0d0d14;
                border-radius: 6px;
                font-size: 10px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>iNoah Hands</h1>
            <div class="video-container" id="videoContainer">
                <img id="videoFeed" src="/video_feed?token={API_SECRET}" />
            </div>
            <div class="controls">
                <div class="section-label">Type Text</div>
                <div class="input-row">
                    <input type="text" class="text-input" id="typeInput" placeholder="Type something..." />
                    <button class="btn" onclick="sendType()">SEND</button>
                </div>
                <div class="section-label">Keys</div>
                <div class="key-grid">
                    <button class="key-btn" onclick="sendKey('enter')">Enter</button>
                    <button class="key-btn" onclick="sendKey('escape')">Esc</button>
                    <button class="key-btn" onclick="sendKey('tab')">Tab</button>
                    <button class="key-btn" onclick="sendKey('backspace')">⌫</button>
                    <button class="key-btn" onclick="sendKey('up')">↑</button>
                    <button class="key-btn" onclick="sendKey('down')">↓</button>
                    <button class="key-btn" onclick="sendKey('left')">←</button>
                    <button class="key-btn" onclick="sendKey('right')">→</button>
                </div>
            </div>
            <div class="log" id="log">Ready. Click on screen to interact.</div>
        </div>
        <script>
            const API_KEY = '{API_SECRET}';
            const headers = {{'X-Agent-Key': API_KEY, 'Content-Type': 'application/json'}};
            function log(msg) {{ document.getElementById('log').innerText = msg; }}
            
            document.getElementById('videoContainer').addEventListener('click', async (e) => {{
                const img = document.getElementById('videoFeed');
                const rect = img.getBoundingClientRect();
                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;
                const x = Math.round((e.clientX - rect.left) * scaleX);
                const y = Math.round((e.clientY - rect.top) * scaleY);
                log('Clicking...');
                await fetch('/click', {{method: 'POST', headers, body: JSON.stringify({{x, y}})}});
                log('Clicked at (' + x + ', ' + y + ')');
            }});
            
            async function sendType() {{
                const text = document.getElementById('typeInput').value;
                if (!text) return;
                await fetch('/type', {{method: 'POST', headers, body: JSON.stringify({{text}})}});
                document.getElementById('typeInput').value = '';
                log('Typed: ' + text);
            }}
            
            async function sendKey(key) {{
                await fetch('/key', {{method: 'POST', headers, body: JSON.stringify({{key}})}});
                log('Pressed: ' + key);
            }}
            
            document.getElementById('typeInput').addEventListener('keydown', (e) => {{
                if (e.key === 'Enter') sendType();
            }});
        </script>
    </body>
    </html>
    """


# =============================================================================
# Video/Screenshot
# =============================================================================

@app.get("/video_feed")
async def video_feed(token: str = None):
    """Live video stream."""
    if token != API_SECRET:
        raise HTTPException(status_code=403)
    return StreamingResponse(generate_stream(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/screenshot")
async def screenshot(token: str = Security(api_key_header)):
    """Returns current screen as base64 + metadata."""
    coord_sys = get_coordinate_system()
    image_b64 = capture_screenshot()
    
    return {
        "image": image_b64,
        "width": coord_sys["width"],
        "height": coord_sys["height"],
        "scale_factor": coord_sys["scale_factor"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


# =============================================================================
# Input Actions
# =============================================================================

@app.post("/click")
async def click(req: dict, token: str = Security(api_key_header)):
    """Click at coordinates."""
    x = req.get("x")
    y = req.get("y")
    
    if x is None or y is None:
        raise HTTPException(status_code=400, detail="x and y coordinates required")
    
    event_data = record_event("click", {"x": x, "y": y})
    pyautogui.click(x, y)
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    coord_sys = get_coordinate_system()
    return {
        "status": "clicked",
        "x": x,
        "y": y,
        "coordinate_system": coord_sys
    }


@app.post("/type")
async def type_text(req: dict, token: str = Security(api_key_header)):
    """Type text."""
    text = req.get("text", "")
    
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    
    event_data = record_event("type", {"text": text})
    pyautogui.write(text)
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    return {"status": "typed", "length": len(text)}


@app.post("/key")
async def press_key(req: dict, token: str = Security(api_key_header)):
    """Press special key."""
    key = req.get("key", "")
    
    valid_keys = [
        "enter", "return", "escape", "esc", "tab", "space",
        "backspace", "delete", "up", "down", "left", "right",
        "home", "end", "pageup", "pagedown",
        "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
        "command", "ctrl", "alt", "shift"
    ]
    
    if not key or key.lower() not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid key. Valid: {valid_keys}")
    
    event_data = record_event("key", {"key": key})
    pyautogui.press(key.lower())
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    return {"status": "pressed", "key": key}


@app.post("/hotkey")
async def hotkey(req: dict, token: str = Security(api_key_header)):
    """Press key combination (e.g., Ctrl+C)."""
    keys = req.get("keys", [])
    
    if not keys:
        raise HTTPException(status_code=400, detail="keys array required")
    
    event_data = record_event("hotkey", {"keys": keys})
    pyautogui.hotkey(*keys)
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    return {"status": "pressed", "keys": keys}


# =============================================================================
# Recording
# =============================================================================

@app.post("/record/start")
async def start_recording(req: dict, token: str = Security(api_key_header)):
    """Start recording interactions."""
    if recording_session["active"]:
        raise HTTPException(status_code=400, detail="Recording already active")
    
    task_prompt = req.get("task_prompt", "")
    session_id = f"sess_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    session_dir = RECORDINGS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    
    recording_session["active"] = True
    recording_session["session_id"] = session_id
    recording_session["task_prompt"] = task_prompt
    recording_session["coordinate_system"] = get_coordinate_system()
    recording_session["events"] = []
    recording_session["event_counter"] = 0
    
    return {
        "status": "recording_started",
        "session_id": session_id,
        "task_prompt": task_prompt
    }


@app.post("/record/stop")
async def stop_recording(token: str = Security(api_key_header)):
    """Stop recording and save."""
    if not recording_session["active"]:
        raise HTTPException(status_code=400, detail="No active recording")
    
    session_id = recording_session["session_id"]
    event_count = len(recording_session["events"])
    session_dir = RECORDINGS_DIR / session_id
    
    metadata = {
        "session_id": session_id,
        "task_prompt": recording_session["task_prompt"],
        "coordinate_system": recording_session["coordinate_system"],
        "event_count": event_count,
        "ended_at": datetime.utcnow().isoformat() + "Z"
    }
    
    with open(session_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    recording_session["active"] = False
    recording_session["session_id"] = None
    recording_session["task_prompt"] = None
    recording_session["events"] = []
    recording_session["event_counter"] = 0
    
    return {"status": "recording_stopped", "session_id": session_id, "event_count": event_count}


@app.get("/record/status")
async def recording_status(token: str = Security(api_key_header)):
    """Get current recording status."""
    return {
        "active": recording_session["active"],
        "session_id": recording_session["session_id"],
        "event_count": len(recording_session["events"]) if recording_session["active"] else 0
    }


@app.get("/recordings")
async def list_recordings(token: str = Security(api_key_header)):
    """List all saved recordings."""
    recordings = []
    
    for session_dir in RECORDINGS_DIR.iterdir():
        if session_dir.is_dir():
            metadata_path = session_dir / "metadata.json"
            if metadata_path.exists():
                with open(metadata_path) as f:
                    recordings.append(json.load(f))
    
    recordings.sort(key=lambda x: x.get("session_id", ""), reverse=True)
    
    return {"recordings": recordings}


# =============================================================================
# Health
# =============================================================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "monitor_index": MONITOR_INDEX
    }


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
