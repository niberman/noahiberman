# iNoah Brain - The Voice

The cognitive engine for the iNoah ecosystem. Provides text generation, vision analysis, and identity-aware content generation.

## Features

- Text generation with identity and style preservation
- Vision/image analysis
- Caption generation
- Memory-augmented context retrieval
- Identity information endpoint

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
uvicorn main:app --host 0.0.0.0 --port 8001
```

## API Endpoints

### Generation

- `POST /generate/text` - Generate styled text
- `POST /generate/caption` - Generate image captions

### Analysis

- `POST /analyze/image` - Analyze image with vision model

### Identity

- `GET /identity` - Get identity information
- `GET /identity/context` - Get formatted identity context

### Memory (via inoah-core)

- `POST /memory/query` - Query memory store
- `POST /memory/add` - Add to memory store
- `GET /memory/stats` - Get memory statistics

### Health

- `GET /health` - Service health check

## Configuration

Configure via `inoah-core/config.json`:

```json
{
  "services": {
    "inoah-brain": {
      "port": 8001,
      "host": "0.0.0.0"
    }
  },
  "ollama": {
    "models": {
      "reasoning": "llama3",
      "vision": "llava"
    }
  }
}
```
