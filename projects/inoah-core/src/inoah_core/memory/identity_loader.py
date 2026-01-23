"""
Identity Loader - Populates the identity collection with biographical facts.
Loads facts from identity_facts.json into ChromaDB for RAG retrieval.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional

from ..shared import get_logger
from .store import MemoryStore, get_memory_store

logger = get_logger("identity_loader")


def _find_identity_facts_file() -> Path:
    """Find the identity_facts.json file."""
    # Check in inoah-core package root
    package_root = Path(__file__).parent.parent.parent.parent
    identity_file = package_root / "identity_facts.json"
    return identity_file


def load_identity_facts() -> Optional[Dict[str, List[str]]]:
    """
    Load identity facts from JSON file.
    
    Returns:
        Dictionary of fact categories, or None if file not found
    """
    identity_file = _find_identity_facts_file()
    
    if not identity_file.exists():
        logger.warning(f"Identity facts file not found: {identity_file}")
        return None
    
    try:
        with open(identity_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse identity facts: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to load identity facts: {e}")
        return None


def populate_identity_collection(force: bool = False) -> int:
    """
    Populate the identity collection with biographical facts.
    
    Args:
        force: If True, clear existing identity data before loading
        
    Returns:
        Number of facts loaded
    """
    store = get_memory_store()
    
    # Check if already populated (unless forcing)
    if not force:
        stats = store.get_stats()
        if stats.get("identity", 0) > 0:
            logger.info(f"Identity collection already has {stats['identity']} facts, skipping")
            return 0
    
    # Load facts from file
    facts_data = load_identity_facts()
    if not facts_data:
        logger.warning("No identity facts to load")
        return 0
    
    # Clear existing if forcing
    if force:
        logger.info("Clearing existing identity data...")
        store.clear_collection(MemoryStore.COLLECTION_IDENTITY)
    
    # Flatten all facts into a list with category metadata
    all_facts = []
    metadatas = []
    
    for category, facts in facts_data.items():
        for fact in facts:
            all_facts.append(fact)
            metadatas.append({
                "category": category,
                "source": "identity_facts.json"
            })
    
    if not all_facts:
        logger.warning("No facts found in identity_facts.json")
        return 0
    
    # Batch insert all facts
    logger.info(f"Loading {len(all_facts)} identity facts...")
    
    try:
        store.add_memories_batch(
            texts=all_facts,
            collection=MemoryStore.COLLECTION_IDENTITY,
            metadatas=metadatas
        )
        logger.info(f"Successfully loaded {len(all_facts)} identity facts")
        return len(all_facts)
    except Exception as e:
        logger.error(f"Failed to load identity facts: {e}")
        return 0


def get_identity_context(query: str, n_results: int = 5) -> str:
    """
    Get relevant identity context for a query.
    
    Args:
        query: The query to match against
        n_results: Number of facts to retrieve
        
    Returns:
        Formatted context string
    """
    store = get_memory_store()
    
    results = store.query(
        query_text=query,
        collection=MemoryStore.COLLECTION_IDENTITY,
        n_results=n_results
    )
    
    if not results:
        return ""
    
    facts = [r["text"] for r in results]
    return "\n".join(f"- {fact}" for fact in facts)


def is_identity_populated() -> bool:
    """Check if identity collection has been populated."""
    try:
        store = get_memory_store()
        stats = store.get_stats()
        return stats.get("identity", 0) > 0
    except Exception:
        return False
