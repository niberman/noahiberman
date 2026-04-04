# iNoah Core

The Hub - Shared infrastructure for the iNoah AI ecosystem.

## Components

- **shared/** - Configuration, logging, identity utilities
- **memory/** - ChromaDB vector store (Exocortex)
- **ollama_client.py** - Unified LLM interface

## Installation

```bash
# Install in editable mode for development
pip install -e .
```

## Usage

```python
from inoah_core import get_config, get_logger, OllamaClient
from inoah_core.memory import MemoryStore, get_memory_store

# Get configuration
config = get_config()

# Create logger
logger = get_logger("my-service")

# Use Ollama
ollama = OllamaClient()
response = ollama.generate("Hello, world!")

# Use memory store
store = get_memory_store()
store.add_memory("Some fact to remember")
```

## Configuration

Edit `config.json` to configure services, paths, and identity.
