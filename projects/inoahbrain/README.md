# iNoahBrain — "The Voice"

**Cognitive Engine for Text Generation, Vision Analysis, and Autonomous Automation**

Part of [Project iNoah](../inoahglobal/README.md) — The Sovereign Digital Twin & AI Ecosystem

---

## Purpose

iNoahBrain is the **cognitive layer** of the iNoah system. It provides:

- **Linguistic Cloning**: Generates text indistinguishable from your writing style
- **Vision Analysis**: Understands images and screenshots using LLaVA
- **Caption Generation**: Instagram-ready captions with strict style enforcement
- **Automation Tools**: Dating automation, social posting, and extensible tool framework

This is the component that gives the AI **your voice**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        iNoahBrain                           │
│                         Port 8001                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    FastAPI Server                     │   │
│  │  /generate/caption  /generate/text  /analyze/image   │   │
│  │  /tools/dating/*    /tools/social/*                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    core/    │  │   tools/    │  │   inoahglobal/      │  │
│  │ HandsClient │  │ BaseTool    │  │   shared/           │  │
│  │             │  │ Dating      │  │   config, ollama,   │  │
│  │             │  │ Social      │  │   logger            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────┐                  ┌─────────────────┐
│  ServerBridge   │                  │     Ollama      │
│   Port 8000     │                  │   Port 11434    │
└─────────────────┘                  └─────────────────┘
```

---

## Core Capabilities

### 1. Linguistic Cloning
Generates text that matches your specific:
- Sentence structure
- Technical vocabulary
- Blunt, direct tone
- No emojis or corporate fluff

### 2. Style Enforcement
Reads rules from `inoahglobal/config.json`:
```json
"style_rules": [
  "No emojis",
  "Technical precision",
  "Blunt tone",
  "No exclamation points"
]
```

### 3. Identity Context
Every generation is aware of who you are:
```json
"identity": {
  "name": "Noah",
  "context": ["Commercial Pilot", "DU Student", "Engineer", "Colorado"]
}
```

---

## API Endpoints

### Health & Identity
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/identity` | GET | Get configured identity and style rules |

### Text Generation
| Endpoint | Method | Payload | Description |
|----------|--------|---------|-------------|
| `/generate/caption` | POST | `{context, image_path?}` | Instagram captions (3 options) |
| `/generate/text` | POST | `{prompt, apply_style?}` | General text in your voice |

### Vision Analysis
| Endpoint | Method | Payload | Description |
|----------|--------|---------|-------------|
| `/analyze/image` | POST | `{image_path, question}` | Analyze image with LLaVA |

### Dating Automation
| Endpoint | Method | Payload | Description |
|----------|--------|---------|-------------|
| `/tools/dating/start` | POST | `{max_swipes?}` | Start swipe loop (background) |
| `/tools/dating/stop` | POST | — | Stop swipe loop |
| `/tools/dating/status` | GET | — | Get stats and running state |

### Training Data Collection
| Endpoint | Method | Payload | Description |
|----------|--------|---------|-------------|
| `/tools/dating/record/start` | POST | `{backend?, platform?}` | Start recording session |
| `/tools/dating/record/sample` | POST | `{label}` | Record a swipe decision |
| `/tools/dating/record/stop` | POST | — | End recording session |
| `/tools/dating/record/stats` | GET | — | Get training data statistics |
| `/tools/dating/analyze` | POST | — | Analyze preference patterns |
| `/tools/dating/preferences` | GET | — | Get preference summary |
| `/tools/dating/sync-memory` | POST | — | Sync preferences to Exocortex |

### Social Posting
| Endpoint | Method | Payload | Description |
|----------|--------|---------|-------------|
| `/tools/social/post` | POST | `{topic, platform?, preview_only?}` | Post to X/Twitter |
| `/tools/social/history` | GET | — | Get posting history |
| `/tools/social/status` | GET | — | Get poster status |

---

## Tools Framework

### HandsClient (`core/hands.py`)
Wrapper for ServerBridge API:
```python
from core.hands import HandsClient

hands = HandsClient()

# Screen control (pyautogui)
hands.click(100, 200)
hands.type_text("Hello")
hands.press("enter")
screenshot = hands.get_screenshot()

# Browser control (Playwright)
hands.browser_launch("https://tinder.com")
hands.browser_press("right", humanize=True)
hands.browser_type("Hello", humanize=True)
browser_screenshot = hands.browser_screenshot()
hands.browser_close()
```

### BaseTool (`tools/base_tool.py`)
Abstract base class for automation tools:
- Access to `HandsClient` and `OllamaClient`
- Identity and style rules from config
- Start/stop lifecycle management
- Prerequisites checking

### Dating Automator (`tools/dating.py`)
Vision-based profile screening with human-like behavior:

**Automation Mode:**
1. Launch browser via Playwright
2. Get screenshot from browser
3. Ask LLaVA: "Is this profile compatible with [Identity Context + Learned Preferences]?"
4. If YES → press right (like), if NO → press left (pass)
5. Randomized delays to avoid bot detection

**Recording Mode:**
1. Launch browser in headed mode
2. Swipe manually while system records screenshots + decisions
3. Training data saved to `inoahglobal/training_data/dating/`
4. Preferences synced to Exocortex memory

### Training Data System (`tools/training_*.py`)
Portable training data collection and preference learning:

- **TrainingRecorder**: Records screenshots + LIKE/PASS decisions
- **PreferenceAnalyzer**: Analyzes patterns using vision AI
- **TrainingDataLoader**: Loads training data for any agent backend

Training data is backend-agnostic and can be used for:
- Headless Playwright browser
- VM with screen capture
- Future mobile automation

### Social Poster (`tools/social.py`)
Automated social media posting:
1. Generate tweet using LLM with style rules
2. Open new browser tab
3. Navigate to X compose
4. Type and submit post

---

## Setup

### Prerequisites
- Python 3.10+
- Ollama with models: `llama3`, `llava`
- ServerBridge running (for tools)
- inoahglobal configured

### Installation
```bash
cd inoahbrain
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Run
```bash
python main.py
```

Or use the orchestrator:
```bash
cd ../inoahglobal
python start_all.py
```

---

## Project Structure

```
inoahbrain/
├── main.py                    # FastAPI server with all endpoints
├── caption_agent.py           # CLI tool for interactive caption generation
├── core/
│   ├── __init__.py
│   └── hands.py               # HandsClient (ServerBridge wrapper)
├── tools/
│   ├── __init__.py
│   ├── base_tool.py           # Abstract base class for tools
│   ├── dating.py              # Dating automation with browser + humanization
│   ├── social.py              # Social media posting
│   ├── training_recorder.py   # Training data collection
│   ├── training_loader.py     # Training data access
│   └── preference_analyzer.py # Preference pattern extraction
└── requirements.txt
```

---

## Caption Generation

### API Usage
```bash
curl -X POST http://localhost:8001/generate/caption \
  -H "Content-Type: application/json" \
  -d '{"context": "Flight training at KAPA, just passed my instrument check ride"}'
```

### Response
```json
{
  "status": "success",
  "captions": "Option 1: Instrument rated. KAPA.\n\nOption 2: Finally checked that box. Instrument rating complete...\n\nOption 3: IFR."
}
```

### CLI Usage
```bash
python caption_agent.py
```

---

## Adding New Tools

1. Create `tools/mytool.py`:
```python
from .base_tool import BaseTool

class MyTool(BaseTool):
    def __init__(self):
        super().__init__("mytool")
    
    def run(self, *args, **kwargs):
        # Your logic here
        screenshot = self.hands.get_screenshot()
        analysis = self.ollama.vision("What's on screen?", screenshot)
        return {"result": analysis}
```

2. Add singleton getter:
```python
_instance = None
def get_mytool():
    global _instance
    if _instance is None:
        _instance = MyTool()
    return _instance
```

3. Add endpoint in `main.py`:
```python
from tools.mytool import get_mytool

@app.post("/tools/mytool/run")
async def run_mytool():
    tool = get_mytool()
    return tool.run()
```

---

## Design Principles

1. **Style First**: Every output adheres to configured style rules
2. **Identity Aware**: Context about who you are informs all generation
3. **Tool Agnostic**: New tools drop in without core changes
4. **ServerBridge Integration**: Full desktop control via HandsClient
5. **Config Driven**: All behavior configurable via JSON



