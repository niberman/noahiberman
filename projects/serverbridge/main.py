import os
import io
import mss
import pyautogui
import uvicorn
import time
import asyncio
import importlib
import skills
import base64
import json
import uuid
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi import FastAPI, Request, HTTPException, Security
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- CONFIG ---
load_dotenv()
API_SECRET = os.getenv("AGENT_SECRET_KEY")
MONITOR_INDEX = 1
RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(exist_ok=True)
sct = mss.mss()

# --- RECORDING STATE ---
recording_session = {
    "active": False,
    "events": [],
    "session_id": None,
    "task_prompt": None,
    "coordinate_system": None,
    "event_counter": 0
}

# --- HELPER FUNCTIONS ---
def get_coordinate_system():
    """Get current screen coordinate system for cross-platform compatibility"""
    try:
        monitor = sct.monitors[MONITOR_INDEX]
    except IndexError:
        monitor = sct.monitors[1]
    
    # Physical dimensions from mss
    physical_width = monitor["width"]
    physical_height = monitor["height"]
    
    # Logical dimensions (what pyautogui uses on Retina)
    logical_width = physical_width // 2
    logical_height = physical_height // 2
    
    return {
        "width": logical_width,
        "height": logical_height,
        "scale_factor": 2  # Mac Retina
    }

def capture_screenshot(save_path=None):
    """Capture screenshot, optionally save to file, return base64 or path"""
    try:
        monitor = sct.monitors[MONITOR_INDEX]
    except IndexError:
        monitor = sct.monitors[1]
    
    sct_img = sct.grab(monitor)
    img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
    # Resize to logical dimensions (half for Retina)
    img = img.resize((img.width // 2, img.height // 2))
    
    if save_path:
        img.save(save_path, format="JPEG", quality=50)
        return str(save_path)
    else:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=50)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

def record_event(action: str, params: dict):
    """Record an event if recording is active"""
    if not recording_session["active"]:
        return None
    
    session_id = recording_session["session_id"]
    session_dir = RECORDINGS_DIR / session_id
    counter = recording_session["event_counter"]
    recording_session["event_counter"] += 1
    
    # Capture before screenshot
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
        "after_screenshot": None  # Will be filled after action
    }
    
    return event, counter

def finalize_event(event, counter):
    """Capture after screenshot and save event"""
    if event is None:
        return
    
    session_id = recording_session["session_id"]
    session_dir = RECORDINGS_DIR / session_id
    
    # Small delay to let screen update
    time.sleep(0.1)
    
    # Capture after screenshot
    after_path = session_dir / f"{counter:03d}_after.jpg"
    capture_screenshot(after_path)
    event["after_screenshot"] = str(after_path)
    
    # Append to JSONL file
    jsonl_path = session_dir / "recording.jsonl"
    with open(jsonl_path, "a") as f:
        f.write(json.dumps(event) + "\n")
    
    recording_session["events"].append(event)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)

# --- VIDEO STREAM ---
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

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>AI Desktop Agent</title>
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
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .recording-dot {{
                width: 10px; height: 10px;
                background: #ef4444;
                border-radius: 50%;
                animation: pulse 1s infinite;
                display: none;
            }}
            .recording-dot.active {{ display: inline-block; }}
            @keyframes pulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.3; }} }}
            
            .video-container {{
                position: relative;
                border: 2px solid #333;
                border-radius: 8px;
                overflow: hidden;
                cursor: crosshair;
            }}
            .video-container img {{
                width: 100%;
                display: block;
            }}
            .click-indicator {{
                position: absolute;
                width: 20px; height: 20px;
                border: 2px solid #8b5cf6;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
                animation: clickPulse 0.5s ease-out forwards;
                display: none;
            }}
            @keyframes clickPulse {{
                0% {{ transform: translate(-50%, -50%) scale(0.5); opacity: 1; }}
                100% {{ transform: translate(-50%, -50%) scale(2); opacity: 0; }}
            }}
            
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
                transition: all 0.15s;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .btn:hover {{ transform: translateY(-1px); }}
            .btn:active {{ transform: translateY(0); }}
            .btn-primary {{ background: #8b5cf6; color: white; }}
            .btn-danger {{ background: #ef4444; color: white; }}
            .btn-success {{ background: #10b981; color: white; }}
            .btn-dark {{ background: #2a2a3e; color: #888; }}
            .btn-dark:hover {{ background: #3a3a4e; color: #aaa; }}
            
            .key-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }}
            .key-btn {{
                padding: 10px 4px;
                background: #1e1e2e;
                border: 1px solid #333;
                border-radius: 4px;
                color: #888;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.1s;
            }}
            .key-btn:hover {{ background: #2a2a3e; color: #fff; border-color: #8b5cf6; }}
            
            .input-row {{
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
            }}
            .text-input {{
                flex: 1;
                padding: 10px;
                background: #1e1e2e;
                border: 1px solid #333;
                border-radius: 6px;
                color: #fff;
                font-family: inherit;
                font-size: 13px;
            }}
            .text-input:focus {{ outline: none; border-color: #8b5cf6; }}
            .text-input::placeholder {{ color: #555; }}
            
            .log {{
                margin-top: 12px;
                padding: 10px;
                background: #0d0d14;
                border-radius: 6px;
                font-size: 10px;
                color: #666;
                max-height: 80px;
                overflow-y: auto;
                word-break: break-all;
            }}
            .log.success {{ color: #10b981; }}
            .log.error {{ color: #ef4444; }}
            
            .section-label {{
                font-size: 9px;
                color: #555;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin: 12px 0 6px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>
                <span class="recording-dot" id="recDot"></span>
                AI Desktop Agent
            </h1>
            
            <div class="video-container" id="videoContainer">
                <img id="videoFeed" src="/video_feed?token={API_SECRET}" />
                <div class="click-indicator" id="clickIndicator"></div>
            </div>
            
            <div class="controls">
                <div class="section-label">Recording</div>
                <div class="input-row">
                    <input type="text" class="text-input" id="taskPrompt" placeholder="Task: Find users who like hiking..." />
                </div>
                <div class="btn-row">
                    <button class="btn btn-success" id="recStartBtn" onclick="startRecording()">● REC</button>
                    <button class="btn btn-danger" id="recStopBtn" onclick="stopRecording()" disabled>■ STOP</button>
                </div>
                
                <div class="section-label">Type Text</div>
                <div class="input-row">
                    <input type="text" class="text-input" id="typeInput" placeholder="Type something..." />
                    <button class="btn btn-primary" onclick="sendType()" style="flex:0 0 70px;">SEND</button>
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
                
                <div class="section-label">Skills</div>
                <div class="btn-row">
                    <button class="btn btn-dark" onclick="executeSkill('pass')">PASS</button>
                    <button class="btn btn-dark" onclick="executeSkill('like')">LIKE</button>
                </div>
            </div>
            
            <div class="log" id="log">Ready. Click anywhere on the screen to interact.</div>
        </div>
        
        <script>
            const API_KEY = '{API_SECRET}';
            const headers = {{'X-Agent-Key': API_KEY, 'Content-Type': 'application/json'}};
            
            function log(msg, type='') {{
                const el = document.getElementById('log');
                el.className = 'log ' + type;
                el.innerText = msg;
            }}
            
            // Click on video to click on screen
            document.getElementById('videoContainer').addEventListener('click', async (e) => {{
                const img = document.getElementById('videoFeed');
                const rect = img.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                // Scale to logical screen coordinates
                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;
                const screenX = Math.round(clickX * scaleX);
                const screenY = Math.round(clickY * scaleY);
                
                // Show click indicator
                const indicator = document.getElementById('clickIndicator');
                indicator.style.left = clickX + 'px';
                indicator.style.top = clickY + 'px';
                indicator.style.display = 'block';
                setTimeout(() => indicator.style.display = 'none', 500);
                
                log(`Clicking at (${{screenX}}, ${{screenY}})...`);
                
                try {{
                    const res = await fetch('/click', {{
                        method: 'POST',
                        headers,
                        body: JSON.stringify({{x: screenX, y: screenY}})
                    }});
                    const data = await res.json();
                    log(`Clicked at (${{data.x}}, ${{data.y}})`, 'success');
                }} catch(err) {{
                    log('Click failed: ' + err, 'error');
                }}
            }});
            
            async function sendType() {{
                const text = document.getElementById('typeInput').value;
                if (!text) return;
                
                log('Typing: ' + text);
                try {{
                    const res = await fetch('/type', {{
                        method: 'POST',
                        headers,
                        body: JSON.stringify({{text}})
                    }});
                    const data = await res.json();
                    document.getElementById('typeInput').value = '';
                    log(`Typed ${{data.length}} chars`, 'success');
                }} catch(err) {{
                    log('Type failed: ' + err, 'error');
                }}
            }}
            
            async function sendKey(key) {{
                log('Pressing: ' + key);
                try {{
                    const res = await fetch('/key', {{
                        method: 'POST',
                        headers,
                        body: JSON.stringify({{key}})
                    }});
                    const data = await res.json();
                    log(`Pressed ${{data.key}}`, 'success');
                }} catch(err) {{
                    log('Key failed: ' + err, 'error');
                }}
            }}
            
            async function executeSkill(instruction) {{
                log('Running skill: ' + instruction);
                try {{
                    const res = await fetch('/execute', {{
                        method: 'POST',
                        headers,
                        body: JSON.stringify({{instruction}})
                    }});
                    const data = await res.json();
                    log(JSON.stringify(data.skill_result), 'success');
                }} catch(err) {{
                    log('Skill failed: ' + err, 'error');
                }}
            }}
            
            async function startRecording() {{
                const taskPrompt = document.getElementById('taskPrompt').value;
                log('Starting recording...');
                try {{
                    const res = await fetch('/record/start', {{
                        method: 'POST',
                        headers,
                        body: JSON.stringify({{task_prompt: taskPrompt}})
                    }});
                    const data = await res.json();
                    document.getElementById('recDot').classList.add('active');
                    document.getElementById('recStartBtn').disabled = true;
                    document.getElementById('recStopBtn').disabled = false;
                    document.getElementById('taskPrompt').disabled = true;
                    log(`Recording: ${{data.session_id}}`, 'success');
                }} catch(err) {{
                    log('Failed to start: ' + err, 'error');
                }}
            }}
            
            async function stopRecording() {{
                log('Stopping recording...');
                try {{
                    const res = await fetch('/record/stop', {{
                        method: 'POST',
                        headers
                    }});
                    const data = await res.json();
                    document.getElementById('recDot').classList.remove('active');
                    document.getElementById('recStartBtn').disabled = false;
                    document.getElementById('recStopBtn').disabled = true;
                    document.getElementById('taskPrompt').disabled = false;
                    log(`Saved ${{data.event_count}} events to ${{data.session_id}}`, 'success');
                }} catch(err) {{
                    log('Failed to stop: ' + err, 'error');
                }}
            }}
            
            // Enter key to send text
            document.getElementById('typeInput').addEventListener('keydown', (e) => {{
                if (e.key === 'Enter') sendType();
            }});
        </script>
    </body>
    </html>
    """

@app.get("/video_feed")
async def video_feed(token: str = None):
    if token != API_SECRET: raise HTTPException(status_code=403)
    return StreamingResponse(generate_stream(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/execute")
async def execute(req: dict, token: str = Security(api_key_header)):
    if not token: pass
    instruction = req.get("instruction", "").lower()
    
    # --- HOT RELOAD MAGIC ---
    # This forces Python to re-read skills.py from the disk
    importlib.reload(skills)
    
    # Run the logic from the fresh file
    result = skills.run_task(instruction)
    
    return {"status": "ok", "skill_result": result}

# --- AI AGENT ENDPOINTS ---

@app.get("/screenshot")
async def screenshot(token: str = Security(api_key_header)):
    """Returns current screen as base64 + metadata"""
    coord_sys = get_coordinate_system()
    image_b64 = capture_screenshot()
    
    return {
        "image": image_b64,
        "width": coord_sys["width"],
        "height": coord_sys["height"],
        "scale_factor": coord_sys["scale_factor"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.post("/click")
async def click(req: dict, token: str = Security(api_key_header)):
    """Click at coordinates. Records if recording active."""
    x = req.get("x")
    y = req.get("y")
    
    if x is None or y is None:
        raise HTTPException(status_code=400, detail="x and y coordinates required")
    
    # Record before action
    event_data = record_event("click", {"x": x, "y": y})
    
    # Perform the click
    pyautogui.click(x, y)
    
    # Record after action
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    # Return response with new screenshot
    coord_sys = get_coordinate_system()
    return {
        "status": "clicked",
        "x": x,
        "y": y,
        "coordinate_system": coord_sys,
        "screenshot": capture_screenshot() if not recording_session["active"] else None
    }

@app.post("/type")
async def type_text(req: dict, token: str = Security(api_key_header)):
    """Type text. Records if recording active."""
    text = req.get("text", "")
    
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    
    # Record before action
    event_data = record_event("type", {"text": text})
    
    # Perform the typing
    pyautogui.write(text)
    
    # Record after action
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    return {
        "status": "typed",
        "length": len(text),
        "screenshot": capture_screenshot() if not recording_session["active"] else None
    }

@app.post("/key")
async def press_key(req: dict, token: str = Security(api_key_header)):
    """Press special key (enter, escape, tab, arrows, etc.)"""
    key = req.get("key", "")
    
    valid_keys = ["enter", "return", "escape", "esc", "tab", "space", 
                  "backspace", "delete", "up", "down", "left", "right",
                  "home", "end", "pageup", "pagedown", "f1", "f2", "f3", 
                  "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
                  "command", "ctrl", "alt", "shift"]
    
    if not key or key.lower() not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid key. Valid keys: {valid_keys}")
    
    # Record before action
    event_data = record_event("key", {"key": key})
    
    # Perform the key press
    pyautogui.press(key.lower())
    
    # Record after action
    if event_data:
        finalize_event(event_data[0], event_data[1])
    
    return {
        "status": "pressed",
        "key": key,
        "screenshot": capture_screenshot() if not recording_session["active"] else None
    }

# --- RECORDING ENDPOINTS ---

@app.post("/record/start")
async def start_recording(req: dict, token: str = Security(api_key_header)):
    """Start recording interactions with intent label"""
    if recording_session["active"]:
        raise HTTPException(status_code=400, detail="Recording already active")
    
    task_prompt = req.get("task_prompt", "")
    session_id = f"sess_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    # Create session directory
    session_dir = RECORDINGS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize recording state
    recording_session["active"] = True
    recording_session["session_id"] = session_id
    recording_session["task_prompt"] = task_prompt
    recording_session["coordinate_system"] = get_coordinate_system()
    recording_session["events"] = []
    recording_session["event_counter"] = 0
    
    return {
        "status": "recording_started",
        "session_id": session_id,
        "task_prompt": task_prompt,
        "coordinate_system": recording_session["coordinate_system"]
    }

@app.post("/record/stop")
async def stop_recording(token: str = Security(api_key_header)):
    """Stop recording and save to JSONL"""
    if not recording_session["active"]:
        raise HTTPException(status_code=400, detail="No active recording")
    
    session_id = recording_session["session_id"]
    event_count = len(recording_session["events"])
    session_dir = RECORDINGS_DIR / session_id
    
    # Write session metadata
    metadata = {
        "session_id": session_id,
        "task_prompt": recording_session["task_prompt"],
        "coordinate_system": recording_session["coordinate_system"],
        "event_count": event_count,
        "started_at": recording_session["events"][0]["timestamp"] if recording_session["events"] else None,
        "ended_at": datetime.utcnow().isoformat() + "Z"
    }
    
    with open(session_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Reset recording state
    recording_session["active"] = False
    recording_session["session_id"] = None
    recording_session["task_prompt"] = None
    recording_session["events"] = []
    recording_session["event_counter"] = 0
    
    return {
        "status": "recording_stopped",
        "session_id": session_id,
        "event_count": event_count,
        "saved_to": str(session_dir)
    }

@app.get("/record/status")
async def recording_status(token: str = Security(api_key_header)):
    """Get current recording status"""
    return {
        "active": recording_session["active"],
        "session_id": recording_session["session_id"],
        "task_prompt": recording_session["task_prompt"],
        "event_count": len(recording_session["events"]) if recording_session["active"] else 0
    }

@app.get("/recordings")
async def list_recordings(token: str = Security(api_key_header)):
    """List all saved recordings"""
    recordings = []
    
    for session_dir in RECORDINGS_DIR.iterdir():
        if session_dir.is_dir():
            metadata_path = session_dir / "metadata.json"
            if metadata_path.exists():
                with open(metadata_path) as f:
                    metadata = json.load(f)
                recordings.append(metadata)
    
    # Sort by session_id (newest first)
    recordings.sort(key=lambda x: x.get("session_id", ""), reverse=True)
    
    return {"recordings": recordings}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)