"""
Memory Store - ChromaDB vector database for the Exocortex.
Stores and retrieves memories using semantic search.
"""

import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

import chromadb
from chromadb.config import Settings

# Add parent to path for shared imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared import get_logger
from shared.config_loader import get_config, get_path

logger = get_logger("memory")


class MemoryStore:
    """
    Vector database for storing and retrieving memories.
    Uses ChromaDB with Ollama embeddings.
    """
    
    # Collection names
    COLLECTION_PROJECT = "project_context"  # Project history and decisions
    COLLECTION_CONVERSATIONS = "conversations"  # Past conversations
    COLLECTION_IDENTITY = "identity"  # Personal facts and preferences
    
    def __init__(self, persist_dir: Optional[str] = None):
        """
        Initialize the memory store.
        
        Args:
            persist_dir: Directory to persist ChromaDB data (uses config.paths.memory if not provided)
        """
        config = get_config()
        
        # Use shared memory path from config, or fallback to local
        if persist_dir is None:
            try:
                persist_dir = str(get_path("memory"))
            except Exception:
                # Fallback if config path not set
                persist_dir = str(Path(__file__).parent / "chromadb_data")
        
        self.persist_dir = persist_dir
        
        # Initialize ChromaDB with persistence
        logger.info(f"Initializing ChromaDB at {persist_dir}")
        
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collections
        self._init_collections()
        
        logger.info("Memory store initialized")
    
    def _init_collections(self):
        """Initialize all collections."""
        # Project context collection
        self.project_collection = self.client.get_or_create_collection(
            name=self.COLLECTION_PROJECT,
            metadata={"description": "Project history, decisions, and architecture"}
        )
        
        # Conversations collection
        self.conversations_collection = self.client.get_or_create_collection(
            name=self.COLLECTION_CONVERSATIONS,
            metadata={"description": "Past conversation history"}
        )
        
        # Identity collection
        self.identity_collection = self.client.get_or_create_collection(
            name=self.COLLECTION_IDENTITY,
            metadata={"description": "Personal facts and preferences"}
        )
    
    def add_memory(
        self,
        text: str,
        collection: str = COLLECTION_PROJECT,
        metadata: Optional[Dict[str, Any]] = None,
        doc_id: Optional[str] = None
    ) -> str:
        """
        Add a memory to the store.
        
        Args:
            text: The text content to store
            collection: Which collection to store in
            metadata: Optional metadata (source, timestamp, etc.)
            doc_id: Optional document ID (auto-generated if not provided)
            
        Returns:
            Document ID
        """
        import hashlib
        import time
        
        # Generate ID if not provided
        if doc_id is None:
            doc_id = hashlib.md5(f"{text[:100]}{time.time()}".encode()).hexdigest()[:16]
        
        # Default metadata
        if metadata is None:
            metadata = {}
        
        metadata["timestamp"] = metadata.get("timestamp", time.time())
        
        # Get the collection
        coll = self._get_collection(collection)
        
        # Add to collection
        coll.add(
            documents=[text],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        logger.debug(f"Added memory {doc_id} to {collection}")
        return doc_id
    
    def add_memories_batch(
        self,
        texts: List[str],
        collection: str = COLLECTION_PROJECT,
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """
        Add multiple memories in a batch.
        
        Args:
            texts: List of text content
            collection: Which collection to store in
            metadatas: Optional list of metadata dicts
            ids: Optional list of document IDs
            
        Returns:
            List of document IDs
        """
        import hashlib
        import time
        
        # Generate IDs if not provided
        if ids is None:
            ids = [
                hashlib.md5(f"{t[:100]}{time.time()}{i}".encode()).hexdigest()[:16]
                for i, t in enumerate(texts)
            ]
        
        # Default metadata
        if metadatas is None:
            metadatas = [{"timestamp": time.time()} for _ in texts]
        else:
            for m in metadatas:
                m["timestamp"] = m.get("timestamp", time.time())
        
        # Get the collection
        coll = self._get_collection(collection)
        
        # Add batch
        coll.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Added {len(texts)} memories to {collection}")
        return ids
    
    def query(
        self,
        query_text: str,
        collection: str = COLLECTION_PROJECT,
        n_results: int = 5,
        where: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Query memories using semantic search.
        
        Args:
            query_text: The query string
            collection: Which collection to search
            n_results: Number of results to return
            where: Optional filter conditions
            
        Returns:
            List of results with text, metadata, and distance
        """
        coll = self._get_collection(collection)
        
        results = coll.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where
        )
        
        # Format results
        formatted = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                formatted.append({
                    "text": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "id": results["ids"][0][i] if results["ids"] else None,
                    "distance": results["distances"][0][i] if results["distances"] else None
                })
        
        return formatted
    
    def query_all_collections(
        self,
        query_text: str,
        n_results: int = 3
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Query all collections and return combined results.
        
        Args:
            query_text: The query string
            n_results: Number of results per collection
            
        Returns:
            Dict mapping collection name to results
        """
        results = {}
        
        for collection in [self.COLLECTION_PROJECT, self.COLLECTION_CONVERSATIONS, self.COLLECTION_IDENTITY]:
            try:
                results[collection] = self.query(query_text, collection, n_results)
            except Exception as e:
                logger.warning(f"Failed to query {collection}: {e}")
                results[collection] = []
        
        return results
    
    def get_relevant_context(
        self,
        query_text: str,
        max_tokens: int = 2000,
        n_results: int = 5
    ) -> str:
        """
        Get relevant context for a query, formatted for LLM injection.
        
        Args:
            query_text: The query/question
            max_tokens: Approximate max tokens for context
            n_results: Number of results to retrieve
            
        Returns:
            Formatted context string
        """
        # Query project context primarily
        results = self.query(query_text, self.COLLECTION_PROJECT, n_results)
        
        if not results:
            return ""
        
        # Build context string
        context_parts = []
        char_count = 0
        max_chars = max_tokens * 4  # Rough estimate
        
        for r in results:
            text = r["text"]
            if char_count + len(text) > max_chars:
                break
            context_parts.append(text)
            char_count += len(text)
        
        if not context_parts:
            return ""
        
        return "\n\n---\n\n".join(context_parts)
    
    def _get_collection(self, name: str):
        """Get collection by name."""
        if name == self.COLLECTION_PROJECT:
            return self.project_collection
        elif name == self.COLLECTION_CONVERSATIONS:
            return self.conversations_collection
        elif name == self.COLLECTION_IDENTITY:
            return self.identity_collection
        else:
            raise ValueError(f"Unknown collection: {name}")
    
    def get_stats(self) -> Dict[str, int]:
        """Get count of documents in each collection."""
        return {
            "project_context": self.project_collection.count(),
            "conversations": self.conversations_collection.count(),
            "identity": self.identity_collection.count()
        }
    
    def clear_collection(self, collection: str):
        """Clear all documents from a collection."""
        coll = self._get_collection(collection)
        
        # Get all IDs
        results = coll.get()
        if results["ids"]:
            coll.delete(ids=results["ids"])
            logger.info(f"Cleared {len(results['ids'])} documents from {collection}")
    
    # =========================================================================
    # CONVERSATION-SPECIFIC METHODS
    # =========================================================================
    
    def save_conversation_turn(
        self,
        user_message: str,
        assistant_message: str,
        session_id: Optional[str] = None
    ) -> str:
        """
        Save a conversation turn (user + assistant exchange).
        
        Args:
            user_message: The user's message
            assistant_message: The assistant's response
            session_id: Optional session identifier for grouping
            
        Returns:
            Document ID of saved conversation
        """
        import time
        
        # Format the conversation turn
        text = f"User: {user_message}\n\nAssistant: {assistant_message}"
        
        # Build metadata
        metadata = {
            "type": "chat_turn",
            "timestamp": time.time(),
            "user_query_preview": user_message[:100] if len(user_message) > 100 else user_message
        }
        
        if session_id:
            metadata["session_id"] = session_id
        
        return self.add_memory(
            text=text,
            collection=self.COLLECTION_CONVERSATIONS,
            metadata=metadata
        )
    
    def get_recent_conversations(
        self,
        n_results: int = 10,
        session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent conversation turns, sorted by timestamp.
        
        Args:
            n_results: Maximum number of conversations to return
            session_id: Optional filter by session
            
        Returns:
            List of conversation turns with metadata
        """
        coll = self._get_collection(self.COLLECTION_CONVERSATIONS)
        
        # Build filter
        where = None
        if session_id:
            where = {"session_id": session_id}
        
        # Get all conversations (ChromaDB doesn't support ORDER BY)
        results = coll.get(
            where=where,
            include=["documents", "metadatas"]
        )
        
        if not results["documents"]:
            return []
        
        # Combine and sort by timestamp
        conversations = []
        for i, doc in enumerate(results["documents"]):
            meta = results["metadatas"][i] if results["metadatas"] else {}
            conversations.append({
                "text": doc,
                "metadata": meta,
                "id": results["ids"][i] if results["ids"] else None,
                "timestamp": meta.get("timestamp", 0)
            })
        
        # Sort by timestamp descending (most recent first)
        conversations.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return conversations[:n_results]
    
    def get_conversation_context(
        self,
        query_text: str,
        max_tokens: int = 1000,
        n_results: int = 3
    ) -> str:
        """
        Get relevant past conversations for context injection.
        
        Args:
            query_text: The current query to match against
            max_tokens: Approximate max tokens for context
            n_results: Number of conversations to retrieve
            
        Returns:
            Formatted conversation context string
        """
        results = self.query(
            query_text=query_text,
            collection=self.COLLECTION_CONVERSATIONS,
            n_results=n_results
        )
        
        if not results:
            return ""
        
        # Build context string
        context_parts = []
        char_count = 0
        max_chars = max_tokens * 4  # Rough estimate
        
        for r in results:
            text = r["text"]
            if char_count + len(text) > max_chars:
                break
            context_parts.append(text)
            char_count += len(text)
        
        if not context_parts:
            return ""
        
        return "\n\n---\n\n".join(context_parts)
    
    def get_full_context(
        self,
        query_text: str,
        max_tokens: int = 2000
    ) -> str:
        """
        Get context from all collections combined.
        Prioritizes: identity > project > conversations.
        
        Args:
            query_text: The query to match against
            max_tokens: Approximate max tokens for combined context
            
        Returns:
            Formatted context string with section headers
        """
        sections = []
        remaining_tokens = max_tokens
        
        # 1. Identity context (highest priority)
        identity_results = self.query(
            query_text, self.COLLECTION_IDENTITY, n_results=3
        )
        if identity_results:
            identity_text = "\n".join(f"- {r['text']}" for r in identity_results)
            sections.append(f"[IDENTITY]\n{identity_text}")
            remaining_tokens -= len(identity_text) // 4
        
        # 2. Project context
        if remaining_tokens > 200:
            project_context = self.get_relevant_context(
                query_text, max_tokens=remaining_tokens // 2
            )
            if project_context:
                sections.append(f"[PROJECT CONTEXT]\n{project_context}")
                remaining_tokens -= len(project_context) // 4
        
        # 3. Conversation history
        if remaining_tokens > 200:
            conv_context = self.get_conversation_context(
                query_text, max_tokens=remaining_tokens
            )
            if conv_context:
                sections.append(f"[PAST CONVERSATIONS]\n{conv_context}")
        
        return "\n\n".join(sections)


# Singleton instance
_memory_store: Optional[MemoryStore] = None


def get_memory_store() -> MemoryStore:
    """Get the singleton MemoryStore instance."""
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
    return _memory_store



