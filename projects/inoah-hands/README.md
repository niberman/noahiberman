# iNoah Hands - The Hands

Low-level desktop interaction capabilities: screenshots, mouse clicks, keyboard input.

## Features

- Screen capture and streaming
- Mouse click at coordinates
- Keyboard typing and key presses
- Hotkey combinations
- Interaction recording for training data
- Web dashboard for manual control

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install inoah-core for shared utilities
pip install -e ../inoah-core
```

## Usage

```bash
# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Screen

- `GET /screenshot` - Get current screen as base64
- `GET /video_feed` - Live video stream (MJPEG)

### Input

- `POST /click` - Click at coordinates
- `POST /type` - Type text
- `POST /key` - Press special key
- `POST /hotkey` - Press key combination

### Recording

- `POST /record/start` - Start recording interactions
- `POST /record/stop` - Stop recording
- `GET /record/status` - Get recording status
- `GET /recordings` - List saved recordings

### Dashboard

- `GET /` - Web dashboard for manual control

## Configuration

Configure via `inoah-core/config.json`:

```json
{
  "services": {
    "inoah-hands": {
      "port": 8000,
      "host": "0.0.0.0",
      "monitor_index": 1
    }
  }
}
```
