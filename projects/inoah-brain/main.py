"""
iNoah Brain - The Voice
Cognitive engine for the iNoah ecosystem.
Provides text generation, vision analysis, and identity-aware content.
"""

import sys
import base64
import io
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Security, File, UploadFile
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, List

from PIL import Image

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import (
    get_logger,
    get_service_config,
    get_api_secret,
    get_identity,
    get_style_rules,
    LLMClient,
)
from inoah_core.memory import get_memory_store, ensure_memory_initialized

# Service configuration
SERVICE_NAME = "inoah-brain"
service_config = get_service_config(SERVICE_NAME)
PORT = service_config.get("port", 8001)

# Setup
logger = get_logger(SERVICE_NAME)
api_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)


# Request/Response models
class TextGenerateRequest(BaseModel):
    prompt: str
    apply_style: bool = True
    include_context: bool = False
    max_tokens: Optional[int] = None


class CaptionRequest(BaseModel):
    context: str
    image_base64: Optional[str] = None


class ImageAnalyzeRequest(BaseModel):
    prompt: str
    image_base64: str


class MemoryQueryRequest(BaseModel):
    query: str
    n_results: int = 5
    collection: Optional[str] = None


class MemoryAddRequest(BaseModel):
    text: str
    collection: Optional[str] = None
    metadata: Optional[dict] = None


# Security
async def verify_api_key(api_key: str = Security(api_key_header)):
    expected_key = get_api_secret()
    if api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info(f"iNoah Brain (The Voice) Starting")
    logger.info(f"Port: {PORT}")
    logger.info("=" * 50)
    
    # Initialize memory on startup
    ensure_memory_initialized()
    
    yield
    logger.info("iNoah Brain shutting down...")


# FastAPI App
app = FastAPI(
    title="iNoah Brain",
    description="The Voice - Cognitive engine for text and vision",
    version="2.0.0",
    lifespan=lifespan
)


# Shared resources
llm = LLMClient()


def get_identity_context() -> str:
    """Get formatted identity context string."""
    identity = get_identity()
    name = identity.get("name", "Noah")
    context = identity.get("context", [])
    return f"{name} - {', '.join(context)}"


def get_style_prompt() -> str:
    """Get style rules as a prompt string."""
    rules = get_style_rules()
    rules_text = "\n".join(f"- {rule}" for rule in rules)
    return f"STYLE RULES:\n{rules_text}"


# =============================================================================
# Health
# =============================================================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    llm_available = llm.is_available()
    
    return {
        "status": "healthy" if llm_available else "degraded",
        "service": SERVICE_NAME,
        "llm_available": llm_available,
        "provider": "lmstudio",
        "models": llm.list_models() if llm_available else []
    }


# =============================================================================
# Text Generation
# =============================================================================

@app.post("/generate/text")
async def generate_text(
    request: TextGenerateRequest,
    api_key: str = Security(verify_api_key)
):
    """
    Generate text using the reasoning model.
    Optionally applies identity style rules and memory context.
    """
    prompt = request.prompt
    
    # Apply style if requested
    if request.apply_style:
        identity_context = get_identity_context()
        style_prompt = get_style_prompt()
        
        prompt = f"""IDENTITY: {identity_context}

{style_prompt}

USER REQUEST: {request.prompt}

Generate a response that adheres to the identity and style rules above."""
    
    # Include memory context if requested
    if request.include_context:
        try:
            store = get_memory_store()
            context = store.get_full_context(request.prompt)
            if context:
                prompt = f"""CONTEXT FROM MEMORY:
{context}

---

{prompt}"""
        except Exception as e:
            logger.warning(f"Failed to get memory context: {e}")
    
    try:
        response = llm.generate(prompt)
        
        return {
            "status": "success",
            "response": response,
            "styled": request.apply_style,
            "context_included": request.include_context
        }
    except Exception as e:
        logger.error(f"Text generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate/caption")
async def generate_caption(
    request: CaptionRequest,
    api_key: str = Security(verify_api_key)
):
    """
    Generate an image caption using identity style.
    Optionally analyzes the image if base64 is provided.
    """
    identity_context = get_identity_context()
    style_prompt = get_style_prompt()
    
    # Optionally analyze the image
    visual_facts = ""
    if request.image_base64:
        try:
            visual_facts = llm.vision(
                "Describe the key elements, setting, and mood of this image briefly.",
                request.image_base64
            )
        except Exception as e:
            logger.warning(f"Vision analysis failed: {e}")
    
    prompt = f"""Generate a caption for an image.

USER CONTEXT: {request.context}
{f'VISUAL ANALYSIS: {visual_facts}' if visual_facts else ''}

IDENTITY: {identity_context}

{style_prompt}

Write ONLY the caption text, nothing else. Keep it concise and impactful."""
    
    try:
        caption = llm.generate(prompt)
        caption = caption.strip().strip('"\'')
        
        return {
            "status": "success",
            "caption": caption,
            "analyzed_image": bool(request.image_base64)
        }
    except Exception as e:
        logger.error(f"Caption generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Vision Analysis
# =============================================================================

@app.post("/analyze/image")
async def analyze_image(
    request: ImageAnalyzeRequest,
    api_key: str = Security(verify_api_key)
):
    """
    Analyze an image using the vision model.
    """
    try:
        response = llm.vision(request.prompt, request.image_base64)
        
        return {
            "status": "success",
            "analysis": response
        }
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/image/upload")
async def analyze_image_upload(
    prompt: str,
    file: UploadFile = File(...),
    api_key: str = Security(verify_api_key)
):
    """
    Analyze an uploaded image using the vision model.
    """
    try:
        contents = await file.read()
        img_b64 = base64.b64encode(contents).decode("utf-8")
        
        response = llm.vision(prompt, img_b64)
        
        return {
            "status": "success",
            "filename": file.filename,
            "analysis": response
        }
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Identity
# =============================================================================

@app.get("/identity")
async def get_identity_info():
    """Get full identity information."""
    identity = get_identity()
    
    return {
        "identity": identity,
        "style_rules": get_style_rules(),
        "context_string": get_identity_context()
    }


@app.get("/identity/context")
async def get_context():
    """Get formatted identity context string."""
    return {"context": get_identity_context()}


# =============================================================================
# Memory
# =============================================================================

@app.post("/memory/query")
async def memory_query(
    request: MemoryQueryRequest,
    api_key: str = Security(verify_api_key)
):
    """Query the memory store."""
    try:
        store = get_memory_store()
        
        if request.collection:
            results = store.query(
                request.query,
                collection=request.collection,
                n_results=request.n_results
            )
        else:
            results = store.query_all_collections(
                request.query,
                n_results=request.n_results
            )
        
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        logger.error(f"Memory query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/add")
async def memory_add(
    request: MemoryAddRequest,
    api_key: str = Security(verify_api_key)
):
    """Add a memory to the store."""
    try:
        store = get_memory_store()
        
        doc_id = store.add_memory(
            text=request.text,
            collection=request.collection or store.COLLECTION_PROJECT,
            metadata=request.metadata
        )
        
        return {
            "status": "success",
            "doc_id": doc_id
        }
    except Exception as e:
        logger.error(f"Memory add failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/stats")
async def memory_stats():
    """Get memory store statistics."""
    try:
        store = get_memory_store()
        stats = store.get_stats()
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Memory stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/context")
async def memory_context(
    query: str,
    max_tokens: int = 2000
):
    """Get relevant context from memory for a query."""
    try:
        store = get_memory_store()
        context = store.get_full_context(query, max_tokens=max_tokens)
        
        return {
            "status": "success",
            "context": context
        }
    except Exception as e:
        logger.error(f"Memory context failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
