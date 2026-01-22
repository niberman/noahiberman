"""
Identity Loader - Populates the identity collection with biographical facts.
Loads facts from identity_facts.json into ChromaDB for RAG retrieval.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add parent to path for shared imports
_parent_dir = str(Path(__file__).parent.parent)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from shared import get_logger

# Handle both relative import (when used as module) and absolute import (when run directly)
try:
    from .store import MemoryStore, get_memory_store
except ImportError:
    from store import MemoryStore, get_memory_store

logger = get_logger("identity_loader")

# Path to identity facts file
IDENTITY_FACTS_FILE = Path(__file__).parent.parent / "identity_facts.json"


def load_identity_facts() -> Optional[Dict[str, List[str]]]:
    """
    Load identity facts from JSON file.
    
    Returns:
        Dictionary of fact categories, or None if file not found
    """
    if not IDENTITY_FACTS_FILE.exists():
        logger.warning(f"Identity facts file not found: {IDENTITY_FACTS_FILE}")
        return None
    
    try:
        with open(IDENTITY_FACTS_FILE, 'r', encoding='utf-8') as f:
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


if __name__ == "__main__":
    """Command-line population of identity facts."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Load identity facts into memory")
    parser.add_argument("--force", action="store_true", help="Force reload (clear existing)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("iNoah Memory - Identity Loader")
    print("=" * 60)
    
    count = populate_identity_collection(force=args.force)
    
    if count > 0:
        print(f"\nLoaded {count} identity facts")
        
        # Show sample query
        print("\n--- Sample Query: 'What does Noah do?' ---")
        context = get_identity_context("What does Noah do?", n_results=3)
        print(context)
    else:
        print("\nNo facts loaded (collection may already be populated)")
        print("Use --force to reload")

