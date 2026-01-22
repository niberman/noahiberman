"""
Document Ingester - Chunks and embeds documents into the memory store.
Handles large files like Project_Context.md.
"""

import os
import sys
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Generator

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

logger = get_logger("ingest")


class DocumentIngester:
    """
    Ingests documents into the memory store.
    Handles chunking, metadata extraction, and batch embedding.
    """
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        memory_store: Optional[MemoryStore] = None
    ):
        """
        Initialize the ingester.
        
        Args:
            chunk_size: Target size of each chunk in characters
            chunk_overlap: Overlap between chunks for context continuity
            memory_store: MemoryStore instance (uses singleton if not provided)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.memory_store = memory_store or get_memory_store()
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks.
        Tries to split on paragraph boundaries.
        
        Args:
            text: The full text to chunk
            
        Returns:
            List of text chunks
        """
        # Split on double newlines (paragraphs)
        paragraphs = re.split(r'\n\n+', text)
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph would exceed chunk size
            if len(current_chunk) + len(para) > self.chunk_size:
                # Save current chunk if it has content
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # Start new chunk with overlap from previous
                if chunks and self.chunk_overlap > 0:
                    # Get last N characters from previous chunk
                    overlap_text = chunks[-1][-self.chunk_overlap:]
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    current_chunk = para
            else:
                # Add paragraph to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def chunk_conversation(self, text: str) -> List[Dict[str, Any]]:
        """
        Chunk a conversation file, preserving turn structure.
        Looks for patterns like "User:" or "Assistant:" or question/answer pairs.
        
        Args:
            text: The conversation text
            
        Returns:
            List of chunks with metadata about the turn
        """
        # Split on common conversation patterns
        # Look for patterns like question marks followed by responses
        lines = text.split('\n')
        
        chunks = []
        current_chunk = ""
        current_type = "context"
        
        for line in lines:
            line_stripped = line.strip()
            
            # Detect if this is a new turn/section
            is_new_section = False
            
            # Check for numbered questions or sections
            if re.match(r'^\d+\.', line_stripped):
                is_new_section = True
            # Check for markdown headers
            elif re.match(r'^#{1,3}\s', line_stripped):
                is_new_section = True
            # Check for question pattern
            elif line_stripped.endswith('?') and len(line_stripped) > 20:
                is_new_section = True
            
            if is_new_section and len(current_chunk) > self.chunk_size // 2:
                # Save current chunk
                if current_chunk.strip():
                    chunks.append({
                        "text": current_chunk.strip(),
                        "type": current_type
                    })
                current_chunk = line + "\n"
            else:
                current_chunk += line + "\n"
        
        # Last chunk
        if current_chunk.strip():
            chunks.append({
                "text": current_chunk.strip(),
                "type": current_type
            })
        
        return chunks
    
    def ingest_file(
        self,
        file_path: str,
        collection: str = MemoryStore.COLLECTION_PROJECT,
        source_name: Optional[str] = None,
        clear_existing: bool = False
    ) -> int:
        """
        Ingest a file into the memory store.
        
        Args:
            file_path: Path to the file to ingest
            collection: Which collection to store in
            source_name: Name to use for source metadata
            clear_existing: Whether to clear the collection first
            
        Returns:
            Number of chunks ingested
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        logger.info(f"Ingesting {file_path}...")
        
        # Read file
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
        
        logger.info(f"Read {len(text)} characters")
        
        # Clear existing if requested
        if clear_existing:
            logger.info(f"Clearing collection {collection}...")
            self.memory_store.clear_collection(collection)
        
        # Chunk the text
        chunks = self.chunk_text(text)
        logger.info(f"Created {len(chunks)} chunks")
        
        if not chunks:
            return 0
        
        # Prepare metadata
        source = source_name or file_path.name
        metadatas = [
            {
                "source": source,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "file_path": str(file_path)
            }
            for i in range(len(chunks))
        ]
        
        # Generate IDs based on source and chunk index
        import hashlib
        ids = [
            hashlib.md5(f"{source}_{i}".encode()).hexdigest()[:16]
            for i in range(len(chunks))
        ]
        
        # Batch ingest
        logger.info(f"Adding {len(chunks)} chunks to {collection}...")
        
        # Add in batches to avoid memory issues
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i+batch_size]
            batch_metas = metadatas[i:i+batch_size]
            batch_ids = ids[i:i+batch_size]
            
            self.memory_store.add_memories_batch(
                texts=batch_chunks,
                collection=collection,
                metadatas=batch_metas,
                ids=batch_ids
            )
            
            logger.info(f"Ingested batch {i//batch_size + 1}/{(len(chunks)-1)//batch_size + 1}")
        
        logger.info(f"Successfully ingested {len(chunks)} chunks from {source}")
        return len(chunks)
    
    def ingest_directory(
        self,
        dir_path: str,
        collection: str = MemoryStore.COLLECTION_PROJECT,
        extensions: List[str] = [".md", ".txt"],
        recursive: bool = True
    ) -> int:
        """
        Ingest all matching files from a directory.
        
        Args:
            dir_path: Directory path
            collection: Which collection to store in
            extensions: File extensions to include
            recursive: Whether to search subdirectories
            
        Returns:
            Total number of chunks ingested
        """
        dir_path = Path(dir_path)
        
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {dir_path}")
        
        total_chunks = 0
        
        pattern = "**/*" if recursive else "*"
        
        for ext in extensions:
            for file_path in dir_path.glob(f"{pattern}{ext}"):
                if file_path.is_file():
                    try:
                        chunks = self.ingest_file(
                            str(file_path),
                            collection=collection,
                            source_name=file_path.name
                        )
                        total_chunks += chunks
                    except Exception as e:
                        logger.error(f"Failed to ingest {file_path}: {e}")
        
        return total_chunks


def ingest_project_context():
    """
    Convenience function to ingest the Project_Context.md file.
    Called from command line or scripts.
    """
    # Find the Project_Context.md file
    project_root = Path(__file__).parent.parent
    context_file = project_root / "Project_Context.md"
    
    if not context_file.exists():
        logger.error(f"Project_Context.md not found at {context_file}")
        return 0
    
    ingester = DocumentIngester(
        chunk_size=1500,  # Larger chunks for conversation context
        chunk_overlap=300
    )
    
    return ingester.ingest_file(
        str(context_file),
        collection=MemoryStore.COLLECTION_PROJECT,
        source_name="Project_Context",
        clear_existing=True
    )


if __name__ == "__main__":
    """Command-line ingestion of Project_Context.md"""
    print("=" * 60)
    print("iNoah Memory - Document Ingestion")
    print("=" * 60)
    
    chunks = ingest_project_context()
    
    if chunks > 0:
        print(f"\nSuccess! Ingested {chunks} chunks into memory.")
        
        # Show stats
        store = get_memory_store()
        stats = store.get_stats()
        print(f"\nMemory Stats:")
        for collection, count in stats.items():
            print(f"  {collection}: {count} documents")
        
        # Test query
        print("\n--- Test Query ---")
        results = store.query("What is the architecture of iNoah?", n_results=2)
        for i, r in enumerate(results):
            print(f"\nResult {i+1} (distance: {r['distance']:.3f}):")
            print(r['text'][:300] + "...")
    else:
        print("\nNo chunks ingested. Check that Project_Context.md exists.")



