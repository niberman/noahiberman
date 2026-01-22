# iNoah Memory - The Unified Memory Core (Exocortex)

**Vector database for persistent memory and RAG retrieval**

Part of [Project iNoah](../README.md) - The Sovereign Digital Twin & AI Ecosystem

---

## Purpose

The Memory subsystem is the **hippocampus** of iNoah. It provides:

- **Persistent Memory**: Conversations and knowledge survive across sessions
- **Semantic Search**: Find relevant information by meaning, not just keywords
- **RAG Integration**: Inject relevant context into LLM prompts
- **Identity Awareness**: Personal facts always available for context

This is what makes the assistant "remember" who you are.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Memory Subsystem                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  ChromaDB (Vector DB)                │    │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────┐    │    │
│  │  │  project_   │ │conversations │ │  identity  │    │    │
│  │  │   context   │ │              │ │            │    │    │
│  │  │             │ │              │ │            │    │    │
│  │  │ - Docs      │ │ - Chat turns │ │ - Bio facts│    │    │
│  │  │ - READMEs   │ │ - Q&A pairs  │ │ - Prefs    │    │    │
│  │  │ - Decisions │ │ - History    │ │ - Expertise│    │    │
│  │  └─────────────┘ └──────────────┘ └────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────┴─────────────────────────────┐  │
│  │                    Memory Store API                    │  │
│  │  add_memory()  query()  save_conversation_turn()      │  │
│  │  get_relevant_context()  get_full_context()           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Collections

### 1. `project_context`
Project documentation, architecture decisions, and technical context.

- Ingested from `Project_Context.md` and READMEs
- Used for technical queries about the system
- Updated manually via ingestion

### 2. `conversations`
Chat history between user and assistant.

- Auto-saved after each chat completion
- Used for multi-turn context and "remembering"
- Metadata includes timestamp and query preview

### 3. `identity`
Personal biographical facts and preferences.

- Loaded from `identity_facts.json`
- Always queried for context
- Highest priority in RAG retrieval

---

## Quick Start

### Auto-Initialization

Memory auto-initializes on service startup:

```python
# Happens automatically in serverbridge and inoahbrain
from inoahglobal.memory import ensure_memory_initialized
ensure_memory_initialized()
```

### Manual Usage

```python
from inoahglobal.memory import get_memory_store, MemoryStore

store = get_memory_store()

# Add a memory
store.add_memory(
    text="Important fact about the project",
    collection=MemoryStore.COLLECTION_PROJECT,
    metadata={"source": "manual"}
)

# Query semantically
results = store.query("What is the project architecture?", n_results=5)

# Get RAG context for LLM
context = store.get_full_context("How does authentication work?")
```

---

## API Reference

### MemoryStore

```python
class MemoryStore:
    # Collection constants
    COLLECTION_PROJECT = "project_context"
    COLLECTION_CONVERSATIONS = "conversations"
    COLLECTION_IDENTITY = "identity"
    
    # Core methods
    def add_memory(text, collection, metadata=None, doc_id=None) -> str
    def add_memories_batch(texts, collection, metadatas=None, ids=None) -> List[str]
    def query(query_text, collection, n_results=5, where=None) -> List[Dict]
    def query_all_collections(query_text, n_results=3) -> Dict[str, List]
    
    # Context retrieval
    def get_relevant_context(query_text, max_tokens=2000) -> str
    def get_conversation_context(query_text, max_tokens=1000) -> str
    def get_full_context(query_text, max_tokens=2000) -> str
    
    # Conversation-specific
    def save_conversation_turn(user_message, assistant_message, session_id=None) -> str
    def get_recent_conversations(n_results=10, session_id=None) -> List[Dict]
    
    # Utilities
    def get_stats() -> Dict[str, int]
    def clear_collection(collection) -> None
```

### DocumentIngester

```python
class DocumentIngester:
    def __init__(chunk_size=1000, chunk_overlap=200)
    def chunk_text(text) -> List[str]
    def ingest_file(file_path, collection, source_name=None, clear_existing=False) -> int
    def ingest_directory(dir_path, collection, extensions=[".md", ".txt"], recursive=True) -> int
```

### Identity Loader

```python
def populate_identity_collection(force=False) -> int
def get_identity_context(query, n_results=5) -> str
def is_identity_populated() -> bool
```

---

## Configuration

### Identity Facts

Edit `inoahglobal/identity_facts.json`:

```json
{
  "biographical": [
    "Noah is a commercial pilot based in Colorado",
    "Noah studies at the University of Denver"
  ],
  "preferences": [
    "Noah prefers direct, blunt communication"
  ],
  "expertise": [
    "Noah has software engineering experience"
  ],
  "projects": [
    "Noah is building iNoah, a sovereign AI system"
  ]
}
```

### Storage Location

ChromaDB persists to `memory/chromadb_data/` by default.

---

## HTTP Endpoints

Via iNoahBrain (port 8001):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/memory/stats` | GET | Get document counts per collection |
| `/memory/query` | POST | Semantic search |
| `/memory/add` | POST | Add a memory |
| `/memory/ingest` | POST | Ingest a file (background) |
| `/memory/context` | GET | Get RAG context for query |

---

## How It Works

### Chat Flow with Memory

1. **User sends message** to `/api/chat`
2. **Memory retrieval**: Query all collections for relevant context
3. **Context injection**: Add memory context to system prompt
4. **LLM generates** response with full context
5. **Save conversation**: Store user/assistant exchange
6. **Return response** to user

### Priority Order

When building context, collections are queried in priority order:

1. **Identity** (always relevant, who you are)
2. **Project Context** (technical knowledge)
3. **Conversations** (past interactions)

---

## CLI Tools

### Ingest Project Context

```bash
cd inoahglobal/memory
python ingest.py
```

### Load Identity Facts

```bash
python identity_loader.py
python identity_loader.py --force  # Reload even if populated
```

---

## Design Principles

1. **Auto-Initialize**: Memory loads on first access, no manual setup
2. **Fail-Safe**: Memory errors never crash the main service
3. **Priority Retrieval**: Identity > Project > Conversations
4. **Persistent**: All data survives restarts
5. **Semantic**: Vector search finds meaning, not just keywords

---

## File Structure

```
memory/
├── __init__.py          # Auto-initialization, exports
├── store.py             # MemoryStore class (ChromaDB wrapper)
├── ingest.py            # DocumentIngester for file loading
├── identity_loader.py   # Identity facts loader
├── chromadb_data/       # Persistent vector storage
└── README.md            # This file
```





