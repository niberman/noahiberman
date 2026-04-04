# iNoah Orchestrator

Service management for the iNoah ecosystem.

## Features

- Start all iNoah services
- Status monitoring
- Graceful shutdown
- Ollama availability check

## Usage

```bash
# Start all services
python start_all.py

# Check status
python status.py
```

## Services

The orchestrator manages:

| Service | Port | Description |
|---------|------|-------------|
| inoah-hands | 8000 | Desktop interaction |
| inoah-brain | 8001 | Cognitive engine |
| inoah-photo | 8002 | Photo processing |
| inoah-dating | 8010 | Dating automation |
| inoah-social | 8011 | Social media posting |

## Requirements

- Python 3.10+
- Ollama running locally
- Virtual environments set up in each service directory
