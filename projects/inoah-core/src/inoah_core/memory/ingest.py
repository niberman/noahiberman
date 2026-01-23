"""
Document Ingester - Chunks and embeds documents into the memory store.
Handles large files like Project_Context.md.
"""

import re
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..shared import get_logger
from .store import MemoryStore, get_memory_store

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
                    overlap_text = chunks[-1][-self.chunk_overlap:]
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    current_chunk = para
            else:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
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
        import hashlib
        
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
        ids = [
            hashlib.md5(f"{source}_{i}".encode()).hexdigest()[:16]
            for i in range(len(chunks))
        ]
        
        # Batch ingest
        logger.info(f"Adding {len(chunks)} chunks to {collection}...")
        
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
    """
    # Find the Project_Context.md file
    project_root = Path(__file__).parent.parent.parent.parent
    context_file = project_root / "Project_Context.md"
    
    if not context_file.exists():
        logger.error(f"Project_Context.md not found at {context_file}")
        return 0
    
    ingester = DocumentIngester(
        chunk_size=1500,
        chunk_overlap=300
    )
    
    return ingester.ingest_file(
        str(context_file),
        collection=MemoryStore.COLLECTION_PROJECT,
        source_name="Project_Context",
        clear_existing=True
    )
