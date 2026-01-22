Hinge Agentic Node
Autonomous Desktop Agent for Hinge Automation

This repository contains a "Closet Server" agent designed to automate interactions with the Hinge dating app (running via PlayCover on macOS or natively on Windows). The system allows you to monitor and control your desktop from anywhere via a mobile-optimized web dashboard, utilizing a high-speed MJPEG video stream and Cloudflare Tunnels.

Architecture
The system follows a Brain-Eye-Hand architecture designed for remote deployment:

The Server (main.py): A FastAPI backend that hosts the web dashboard and handles secure API requests.

The Eyes (MSS): Uses mss for high-performance raw screen capture. It bypasses Cloudflare caching tricks by streaming a live MJPEG feed.

The Hands (skills.py): Uses pyautogui and opencv (Template Matching) to locate UI elements (like the "X" or "Heart" buttons) and simulate human-like clicks.

The Brain (Hot-Reload): The logic in skills.py is hot-reloadable. You can edit the clicking logic or calibration parameters in real-time without restarting the video stream server.

Features
Live Remote Feed: Low-latency MJPEG streaming of your desktop screen to your phone.

Remote Control: "Pass" and "Like" buttons on the dashboard trigger physical keystrokes/clicks on the host machine.

Hot-Reloading Logic: Edit skills.py on the fly to tune computer vision parameters; the next API call uses the new code instantly.

Retina & Standard Support: Configurable SCALING_FACTOR to handle macOS Retina displays (2x scaling) vs. Standard Windows monitors (1x scaling).

Cloudflare Bypass: Optimized headers and streaming protocols to prevent caching issues on remote networks.

Prerequisites
Python 3.10+

Cloudflare Tunnel (cloudflared) for remote access.

PlayCover (if running on macOS) or the native Hinge app/browser.

Installation
Clone the repo:

Bash

git clone <your-repo-url>
cd hinge-agent
Create a virtual environment:

Bash

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
Install dependencies:

Bash

pip install fastapi uvicorn mss pyautogui opencv-python pillow python-dotenv
Setup Environment Variables: Create a .env file in the root directory:

Code snippet

AGENT_SECRET_KEY=super_secret_password
OPENAI_API_KEY=sk-... (Optional for future GPT-4o integration)
Capture Assets: You must take small, cropped screenshots of the buttons you want the agent to click. Save them in the root folder:

btn_pass.png (The "X" button)

btn_like.png (The "Heart" button)

Usage
1. Start the Master Node
Run the server. It will start the video stream on Port 8000.

Bash

./venv/bin/python main.py
2. Start the Tunnel
Expose the local server to the internet using Cloudflare.

Bash

cloudflared tunnel run --url http://127.0.0.1:8000 visualagent
3. Access the Dashboard
Navigate to your Cloudflare URL (e.g., https://agent.yourdomain.com).

View: Live feed of your desktop.

Act: Click "PASS" or "LIKE" to trigger the agent.

Development Workflow (Cursor)
This project is optimized for development in Cursor.

Open skills.py: This is where the logic lives.

Calibrate Scaling:

If running on a Macbook Pro (Retina), ensure:

Python

SCALING_FACTOR = 2
If the mouse clicks the wrong spot (overshoots/undershoots), adjust this value.

Test Instantly:

Save skills.py.

Click a button on your mobile dashboard.

main.py will reload your changes immediately and execute the new logic.

Migration Guide (Mac -> PC)
When moving this "Closet Server" from your current Mac to a Windows PC:

Copy the entire folder to the Windows machine.

Update skills.py:

Change SCALING_FACTOR to 1.

Retake Screenshots:

Delete btn_pass.png and btn_like.png.

Take new screenshots of the buttons on the Windows machine (font rendering differs between OSs, so old images won't match).

Run: Use python main.py (instead of ./venv/bin/python).

Troubleshooting
Image Not Found: Ensure btn_pass.png contains only the button icon, no dynamic background.

Mouse Clicks Wrong Spot: Check SCALING_FACTOR in skills.py.

Static Video Feed: Ensure you are using the cloudflared command provided above, and that your browser isn't in "Low Power Mode" (which stops JS execution).