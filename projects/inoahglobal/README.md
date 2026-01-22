# Project iNoah: The Sovereign Digital Twin & AI Ecosystem

## Central Command Hub

This is the configuration and orchestration center for the entire iNoah system.

---

## Project Vision

**iNoah** is a locally hosted, privacy-first AI Operating System designed to serve two primary functions:

1. **A Sovereign Personal Assistant**: A complete replacement for Google Gemini and ChatGPT, running entirely on your own hardware to handle research, reasoning, and daily workflows without corporate surveillance or filters.

2. **An Autonomous "Digital Twin"**: A centralized nervous system that replicates your visual likeness, writing style, and engineering capabilities to automate your personal brand and digital presence.

---

## Strategic Goals

| Goal | Description |
|------|-------------|
| **Digital Sovereignty** | Your data, model weights, and cognitive processes remain your private property |
| **Cognitive Extension** | An "Exocortex" that scales your ability to research, code, and produce content |
| **Identity Continuity** | Digital interactions remain consistent with your real-world identity |
| **Future-Proof Architecture** | Modular design allows swapping models and tools without breaking the system |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    inoahglobal (Central Hub)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │ config.json │  │   shared/    │  │       memory/         │   │
│  │             │  │              │  │  "The Exocortex"      │   │
│  │ - ollama    │  │ config_loader│  │                       │   │
│  │ - services  │  │ ollama_client│  │  ┌─────────────────┐  │   │
│  │ - paths     │  │ logger       │  │  │    ChromaDB     │  │   │
│  │ - identity  │  │              │  │  │ - project_ctx   │  │   │
│  │             │  │              │  │  │ - conversations │  │   │
│  └─────────────┘  └──────────────┘  │  │ - identity      │  │   │
│                                      │  └─────────────────┘  │   │
│  ┌──────────────────────────────┐   └───────────────────────┘   │
│  │     identity_facts.json      │                               │
│  │  Biographical data for RAG   │                               │
│  └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  serverbridge   │  │   inoahbrain    │  │   inoahphoto    │
│  "The Hands"    │  │   "The Voice"   │  │   "The Face"    │
│   Port 8000     │  │    Port 8001    │  │    Port 8002    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │
         └────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │     Ollama      │
         │   Port 11434    │
         │  llama3, llava  │
         └─────────────────┘
```

---

## Core Components

### 1. The Sovereign Assistant (Gemini Replacement)
- **Unrestricted Intelligence**: No corporate safety filters, tracking, or usage limits
- **Deep Personalization**: Permanently remembers your context (Pilot, Student, Engineer)
- **Active Research**: Browses the web autonomously for real-time information

### 2. The Face (Visual Engine) — `inoahphoto/`
- **Autonomous Identity Management**: Processes and enhances photography
- **High-Fidelity Enhancement**: Professional-grade correction via FaceFusion
- **Identity Consistency**: Standardizes appearance across all media

### 3. The Voice (Cognitive Engine) — `inoahbrain/`
- **Linguistic Cloning**: Generates text indistinguishable from your writing
- **Tone Enforcement**: Strict adherence to communication rules (no emojis, blunt tone)
- **Caption Generation**: Instagram-ready captions in your voice

### 4. The Hands (Autonomous Engineering) — `serverbridge/`
- **Agentic Control**: Permission to touch the server, manage files, restart services
- **Remote Control**: Screen streaming and input injection from anywhere
- **Skill Execution**: Natural language commands to complex actions

### 5. The Arsenal (Specialized Tools) — `inoahbrain/tools/`
- **Dating Automation**: Vision-based profile screening and swiping
- **Social Posting**: Generates and posts to X/Twitter in your voice
- **Extensible**: Drop in new tools, the system recognizes them immediately

### 6. The Exocortex (Unified Memory) — `memory/`
- **Persistent Memory**: Conversations and knowledge survive across sessions
- **Semantic Search**: Find relevant information by meaning via ChromaDB
- **Auto-Initialization**: Identity facts and project docs load on startup
- **RAG Integration**: Relevant context injected into every LLM prompt

---

## Memory System

The memory subsystem is the **hippocampus** of iNoah — it's what makes the assistant "remember."

### Collections

| Collection | Purpose | Auto-Populated |
|------------|---------|----------------|
| `project_context` | Technical docs, architecture, decisions | On startup (from README/docs) |
| `conversations` | Chat history, Q&A pairs | After each chat |
| `identity` | Biographical facts, preferences | On startup (from identity_facts.json) |

### How It Works

1. **Startup**: Memory auto-initializes with identity facts and project docs
2. **Query**: Each chat retrieves relevant context from all collections
3. **Inject**: Context is added to the LLM system prompt
4. **Save**: Completed conversations are saved for future context

### Configuration

Edit `identity_facts.json` to add biographical facts:

```json
{
  "biographical": ["Noah is a commercial pilot based in Colorado"],
  "preferences": ["Noah prefers direct, blunt communication"],
  "expertise": ["Noah has software engineering experience"]
}
```

See [memory/README.md](memory/README.md) for full documentation.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Ollama running locally with models pulled:
  ```bash
  ollama pull llama3
  ollama pull llava
  ```

### Start All Services
```bash
cd inoahglobal
python start_all.py
```

### Check System Status
```bash
python status.py
```

---

## Configuration

All system settings are centralized in `config.json`:

```json
{
  "ollama": {
    "host": "http://localhost:11434",
    "models": {"reasoning": "llama3", "vision": "llava"}
  },
  "services": {
    "serverbridge": {"port": 8000},
    "inoahbrain": {"port": 8001},
    "inoahphoto": {"port": 8002}
  },
  "identity": {
    "name": "Noah",
    "context": ["Commercial Pilot", "DU Student", "Engineer"],
    "style_rules": ["No emojis", "Technical precision", "Blunt tone"]
  }
}
```

Changing a value here updates the entire system.

---

## API Reference

### ServerBridge (port 8000) — API Gateway
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/` | GET | Web dashboard |
| `/api/status` | GET | Aggregate status of all services |
| `/api/chat` | POST | Streaming chat with memory (Sovereign Assistant) |
| `/api/identity` | GET | Get identity config |
| `/api/brain/*` | * | Proxy to iNoahBrain |
| `/api/photo/*` | * | Proxy to iNoahPhoto |
| `/video_feed` | GET | Screen stream |
| `/click` | POST | Remote click |
| `/type` | POST | Type text |
| `/press` | POST | Press key |
| `/hotkey` | POST | Key combination |
| `/execute` | POST | Execute skill |

### iNoahBrain (port 8001)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/generate/caption` | POST | Generate Instagram captions |
| `/generate/text` | POST | Generate styled text |
| `/analyze/image` | POST | Vision analysis |
| `/identity` | GET | Get identity config |
| `/tools/dating/start` | POST | Start dating automation |
| `/tools/dating/stop` | POST | Stop dating automation |
| `/tools/social/post` | POST | Post to social media |
| `/memory/stats` | GET | Get memory collection stats |
| `/memory/query` | POST | Semantic search memories |
| `/memory/add` | POST | Add a memory |
| `/memory/ingest` | POST | Ingest a document file |
| `/memory/context` | GET | Get RAG context for query |

### iNoahPhoto (port 8002)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/process` | POST | Start batch processing |
| `/status` | GET | Processing status |
| `/files/raw` | GET | List raw photos |
| `/files/output` | GET | List processed photos |

---

## Design Principles

1. **Unified Memory Core**: ChromaDB vector store provides persistent memory across sessions
2. **Director-Worker Hierarchy**: LLM directs, scripts execute
3. **Loose Coupling**: All communication via standardized APIs
4. **Swap-Ready**: New models drop in without code changes
5. **Config-Driven**: JSON controls the entire system
6. **Auto-Initialization**: Memory and identity facts load automatically on startup
7. **RAG-First**: Every LLM call receives relevant context from memory

---

## Remote Access

The system supports secure remote access via Cloudflare Zero Trust tunnel:

```yaml
# config.yml (serverbridge)
ingress:
  - hostname: agent.noahiberman.com
    service: http://localhost:8000
```

Access your AI infrastructure from any device, anywhere, while data stays local.

---

## License

Private. All rights reserved.
