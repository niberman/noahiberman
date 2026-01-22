"""
iNoah Memory - The Unified Memory Core (Exocortex)
Vector database for persistent memory and RAG retrieval.
Uses ChromaDB for storage and Ollama for embeddings.

Auto-ingests project documentation and identity facts on first startup.
"""

import os
from pathlib import Path

from .store import MemoryStore, get_memory_store
from .ingest import DocumentIngester, ingest_project_context
from .identity_loader import (
    populate_identity_collection,
    get_identity_context,
    is_identity_populated
)

__all__ = [
    "MemoryStore",
    "get_memory_store",
    "DocumentIngester",
    "ingest_project_context",
    "populate_identity_collection",
    "get_identity_context",
    "is_identity_populated",
    "auto_initialize_memory"
]

# Flag to track if auto-init has run this session
_auto_init_done = False


def auto_initialize_memory(force: bool = False) -> dict:
    """
    Automatically initialize memory with project docs and identity facts.
    Only runs once per session unless forced.
    
    Args:
        force: If True, reinitialize even if already done
        
    Returns:
        Dictionary with initialization results
    """
    global _auto_init_done
    
    if _auto_init_done and not force:
        return {"status": "skipped", "reason": "already_initialized"}
    
    results = {
        "status": "success",
        "project_chunks": 0,
        "identity_facts": 0,
        "errors": []
    }
    
    try:
        store = get_memory_store()
        stats = store.get_stats()
        
        # 1. Ingest project context if empty
        if stats.get("project_context", 0) == 0:
            try:
                project_root = Path(__file__).parent.parent
                context_file = project_root / "Project_Context.md"
                
                if context_file.exists():
                    chunks = ingest_project_context()
                    results["project_chunks"] = chunks
                else:
                    # Try to ingest READMEs instead
                    ingester = DocumentIngester(chunk_size=1500, chunk_overlap=300)
                    
                    # Ingest main README
                    readme_file = project_root / "README.md"
                    if readme_file.exists():
                        chunks = ingester.ingest_file(
                            str(readme_file),
                            collection=MemoryStore.COLLECTION_PROJECT,
                            source_name="README"
                        )
                        results["project_chunks"] += chunks
                        
            except Exception as e:
                results["errors"].append(f"Project ingest error: {e}")
        
        # 2. Load identity facts if empty
        if stats.get("identity", 0) == 0:
            try:
                facts = populate_identity_collection()
                results["identity_facts"] = facts
            except Exception as e:
                results["errors"].append(f"Identity load error: {e}")
        
        _auto_init_done = True
        
        if results["errors"]:
            results["status"] = "partial"
            
    except Exception as e:
        results["status"] = "error"
        results["errors"].append(str(e))
    
    return results


def ensure_memory_initialized():
    """
    Ensure memory is initialized. Call this at service startup.
    Non-blocking, safe to call multiple times.
    """
    global _auto_init_done
    
    if _auto_init_done:
        return
    
    # Run auto-init in a try/except to never block service startup
    try:
        result = auto_initialize_memory()
        if result["status"] in ["success", "partial"]:
            from .store import logger
            logger.info(
                f"Memory auto-initialized: {result['project_chunks']} project chunks, "
                f"{result['identity_facts']} identity facts"
            )
    except Exception as e:
        # Log but don't fail
        import logging
        logging.getLogger("memory").warning(f"Memory auto-init failed: {e}")
    
    _auto_init_done = True

