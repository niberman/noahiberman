"""
iNoahBrain - "The Voice"
Cognitive engine for caption generation, text analysis, and linguistic cloning.
"""

import os
import sys
import glob
import threading
import time
from pathlib import Path
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add inoahglobal to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from inoahglobal.shared import get_config, get_logger, OllamaClient
from inoahglobal.shared.config_loader import (
    get_service_config,
    get_identity,
    get_style_rules,
    get_path,
    get_nested
)

# --- CONFIG ---
config = get_config()
service_config = get_service_config("inoahbrain")
PORT = service_config.get("port", 8001)
HOST = service_config.get("host", "0.0.0.0")

# Logger and Ollama client
logger = get_logger("inoahbrain")
ollama = OllamaClient()


# --- PERSONA SYSTEM ---
def get_persona(persona_name: str = "private") -> dict:
    """
    Load persona configuration from config.json.
    
    Args:
        persona_name: Either "private" (Sovereign Assistant) or "public" (Digital Twin)
        
    Returns:
        Persona config dict with name, system_prompt, allow_tools
    """
    default_private = {
        "name": "Sovereign Assistant",
        "system_prompt": "You are Noah's private Exocortex. Be blunt, direct, and efficient.",
        "allow_tools": True
    }
    
    persona = get_nested(f"personas.{persona_name}", None)
    if persona is None:
        logger.warning(f"Persona '{persona_name}' not found, defaulting to private")
        return default_private
    
    return persona


def require_tools_allowed(x_persona: Optional[str] = Header(None, alias="X-Persona")):
    """
    Dependency that blocks tool access when persona doesn't allow tools.
    Used on all /tools/* endpoints to enforce security gate.
    """
    # Default to private if no header (backwards compatibility)
    persona_name = x_persona or "private"
    persona = get_persona(persona_name)
    
    if not persona.get("allow_tools", True):
        logger.warning(f"Tool access blocked for persona '{persona_name}'")
        raise HTTPException(
            status_code=403,
            detail=f"Tool access is not permitted for the '{persona.get('name', persona_name)}' persona. "
                   f"This action requires the Sovereign Assistant (private) persona."
        )
    
    return persona_name

app = FastAPI(
    title="iNoah Brain",
    description="The Voice - Cognitive engine for text generation and analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- MODELS ---
class CaptionRequest(BaseModel):
    context: str  # User-provided context about the photo
    image_path: Optional[str] = None  # Path to image (optional if using latest)


class GenerateRequest(BaseModel):
    prompt: str
    apply_style: bool = True  # Apply Noah's style rules
    persona: str = "private"  # "private" (full access) or "public" (restricted)


class AnalyzeRequest(BaseModel):
    image_path: str
    question: str = "Describe this image in detail."


# --- HEALTH CHECK ---
@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring."""
    ollama_status = "online" if ollama.is_available() else "offline"
    models = ollama.list_models() if ollama_status == "online" else []
    
    return {
        "service": "inoahbrain",
        "status": "healthy",
        "version": config.get("version", "unknown"),
        "ollama": ollama_status,
        "models_available": models,
        "port": PORT
    }


# --- CAPTION GENERATION ---
@app.post("/generate/caption")
async def generate_caption(request: CaptionRequest):
    """
    Generate Instagram captions in Noah's voice.
    Uses vision model to analyze image, then reasoning model to write captions.
    """
    logger.info(f"Generating caption with context: {request.context[:50]}...")
    
    # Find the image
    image_path = request.image_path
    if not image_path:
        # Use latest from photo output
        output_dir = get_path("photo_output")
        if output_dir.exists():
            files = list(output_dir.glob("*"))
            if files:
                image_path = str(max(files, key=lambda f: f.stat().st_mtime))
    
    if not image_path or not Path(image_path).exists():
        raise HTTPException(status_code=404, detail="No image found")
    
    # Step 1: Vision analysis
    logger.info("Scanning image structure...")
    try:
        visual_facts = ollama.vision(
            "Describe the technical setting, lighting, and key objects in this image. Keep it brief and objective.",
            image_path
        )
    except Exception as e:
        logger.error(f"Vision error: {e}")
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {e}")
    
    # Step 2: Generate captions with style rules
    identity = get_identity()
    style_rules = get_style_rules()
    style_rules_text = "\n".join(f"- {rule}" for rule in style_rules)
    
    prompt = f"""
    USER NOTES: "{request.context}"
    VISUAL FACTS: "{visual_facts}"
    
    TASK: Rewrite these notes into 3 Instagram captions.
    
    IDENTITY CONTEXT: {identity.get('name', 'Noah')} - {', '.join(identity.get('context', []))}
    
    STYLE GUIDE:
    - Write like a human, not a corporation.
    - Be casual and direct. 
    - Use sentence fragments. It's okay to drop pronouns.
    {style_rules_text}
    
    Option 1: The Logbook (Short, factual, just the cool details)
    Option 2: The Story (Conversational, exactly how you'd say it to a friend)
    Option 3: The Vibe (One short line. Abstract.)
    
    STRICT RULES:
    - ABSOLUTELY NO EMOJIS.
    - No exclamation points.
    - No hashtags inline.
    - Tone: Professional, high-status, blunt.
    """
    
    logger.info("Drafting caption options...")
    try:
        captions = ollama.generate(prompt)
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Caption generation failed: {e}")
    
    return {
        "status": "success",
        "image": image_path,
        "visual_analysis": visual_facts,
        "captions": captions
    }


# --- TEXT GENERATION ---
@app.post("/generate/text")
async def generate_text(request: GenerateRequest):
    """
    Generate text in Noah's voice with style rules applied.
    Supports persona-based system prompts (private vs public).
    """
    logger.info(f"Generating text [{request.persona}]: {request.prompt[:50]}...")
    
    # Load persona configuration
    persona = get_persona(request.persona)
    persona_system_prompt = persona.get("system_prompt", "")
    
    prompt = request.prompt
    
    if request.apply_style:
        identity = get_identity()
        style_rules = get_style_rules()
        style_rules_text = "\n".join(f"- {rule}" for rule in style_rules)
        
        prompt = f"""
        {persona_system_prompt}
        
        IDENTITY: {identity.get('name', 'Noah')} - {', '.join(identity.get('context', []))}
        
        STYLE RULES:
        {style_rules_text}
        
        TASK: {request.prompt}
        
        Write in a direct, blunt tone. No corporate speak. No fluff.
        """
    
    try:
        response = ollama.generate(prompt)
        return {
            "status": "success",
            "response": response,
            "style_applied": request.apply_style,
            "persona": request.persona
        }
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- IMAGE ANALYSIS ---
@app.post("/analyze/image")
async def analyze_image(request: AnalyzeRequest):
    """
    Analyze an image using the vision model.
    """
    logger.info(f"Analyzing image: {request.image_path}")
    
    if not Path(request.image_path).exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        analysis = ollama.vision(request.question, request.image_path)
        return {
            "status": "success",
            "image": request.image_path,
            "question": request.question,
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- IDENTITY INFO ---
@app.get("/identity")
async def get_identity_info():
    """Return configured identity and style rules."""
    identity = get_identity()
    return {
        "name": identity.get("name", "Noah"),
        "context": identity.get("context", []),
        "style_rules": identity.get("style_rules", [])
    }


# =============================================================================
# TOOLS API - Automation Tools
# =============================================================================

from tools.dating import get_dating_automator
from tools.social import get_social_poster
from tools.instagram import get_instagram_poster


# --- MODELS FOR TOOLS ---
class SocialPostRequest(BaseModel):
    topic: str
    platform: str = "x"
    preview_only: bool = False


class DatingStartRequest(BaseModel):
    max_swipes: Optional[int] = None


class InstagramPostRequest(BaseModel):
    image_path: str  # Path to the image to post
    context: str  # Context for caption generation
    preview_only: bool = False  # If True, only generate caption without posting


# --- DATING TOOL ENDPOINTS ---
@app.post("/tools/dating/start")
async def start_dating_automation(
    request: DatingStartRequest,
    background_tasks: BackgroundTasks,
    persona: str = Depends(require_tools_allowed)
):
    """
    Start the dating automation swipe loop.
    Runs in background - check /tools/dating/status for progress.
    """
    dating = get_dating_automator()
    
    if dating.is_running:
        raise HTTPException(status_code=409, detail="Dating automation already running")
    
    # Check prerequisites
    ok, msg = dating.check_prerequisites()
    if not ok:
        raise HTTPException(status_code=503, detail=msg)
    
    # Start in background
    def run_dating():
        dating.run(max_swipes=request.max_swipes)
    
    dating._running = True
    background_tasks.add_task(run_dating)
    
    logger.info(f"Dating automation started (max_swipes={request.max_swipes})")
    
    return {
        "status": "started",
        "max_swipes": request.max_swipes,
        "message": "Swipe loop started in background"
    }


@app.post("/tools/dating/stop")
async def stop_dating_automation(persona: str = Depends(require_tools_allowed)):
    """Stop the dating automation swipe loop."""
    dating = get_dating_automator()
    
    if not dating.is_running:
        return {"status": "not_running", "message": "Dating automation is not running"}
    
    result = dating.stop()
    logger.info("Dating automation stopped")
    
    return {
        "status": "stopped",
        "stats": dating.stats
    }


@app.get("/tools/dating/status")
async def get_dating_status():
    """Get current dating automation status and statistics."""
    dating = get_dating_automator()
    return dating.get_status()


# --- DATING TRAINING ENDPOINTS ---
from tools.training_recorder import get_training_recorder
from tools.preference_analyzer import get_preference_analyzer
from tools.training_loader import get_training_loader


class RecordingStartRequest(BaseModel):
    backend: str = "browser"
    platform: str = "tinder"


class RecordingSampleRequest(BaseModel):
    label: str  # "LIKE" or "PASS"
    thinking_time_ms: Optional[int] = None


@app.post("/tools/dating/record/start")
async def start_recording(request: RecordingStartRequest, persona: str = Depends(require_tools_allowed)):
    """
    Start a new training data recording session.
    Launch browser in headed mode for manual swiping.
    """
    recorder = get_training_recorder()
    
    if recorder.is_recording:
        return {"status": "already_recording", "session": recorder._session_id}
    
    session_id = recorder.start_session(backend=request.backend, platform=request.platform)
    
    return {
        "status": "started",
        "session_id": session_id,
        "message": "Recording started. Swipe manually and call /record/sample for each decision."
    }


@app.post("/tools/dating/record/sample")
async def record_sample(request: RecordingSampleRequest, persona: str = Depends(require_tools_allowed)):
    """
    Record a single training sample with screenshot and label.
    Call this after each manual swipe decision.
    """
    import requests
    import io
    from PIL import Image
    from inoahglobal.shared.config_loader import get_service_config, get_api_secret
    
    recorder = get_training_recorder()
    
    if not recorder.is_recording:
        raise HTTPException(status_code=400, detail="No active recording session")
    
    # Get screenshot from browser
    config = get_service_config("serverbridge")
    port = config.get("port", 8000)
    api_secret = get_api_secret()
    
    try:
        response = requests.get(
            f"http://localhost:{port}/browser/screenshot",
            headers={"X-Agent-Key": api_secret},
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to get screenshot")
        
        screenshot = Image.open(io.BytesIO(response.content))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screenshot error: {e}")
    
    # Record the sample
    sample = recorder.record_sample(
        screenshot=screenshot,
        label=request.label,
        thinking_time_ms=request.thinking_time_ms
    )
    
    return {
        "status": "recorded",
        "sample": sample
    }


@app.post("/tools/dating/record/stop")
async def stop_recording(persona: str = Depends(require_tools_allowed)):
    """
    Stop the current recording session.
    Triggers preference analysis if enough samples collected.
    """
    recorder = get_training_recorder()
    
    if not recorder.is_recording:
        return {"status": "not_recording"}
    
    result = recorder.end_session(auto_analyze=True)
    
    return {
        "status": "stopped",
        "session": result
    }


@app.get("/tools/dating/record/stats")
async def get_recording_stats():
    """Get training data statistics."""
    recorder = get_training_recorder()
    return recorder.get_stats()


@app.post("/tools/dating/analyze")
async def analyze_preferences(persona: str = Depends(require_tools_allowed)):
    """
    Run preference analysis on collected training data.
    Generates patterns and preference summary.
    """
    analyzer = get_preference_analyzer()
    
    try:
        patterns = analyzer.analyze_patterns()
        
        if patterns.get("status") == "insufficient_data":
            return {
                "status": "insufficient_data",
                "message": f"Need at least {patterns.get('min_required', 10)} samples",
                "current_samples": patterns.get("total_samples", 0)
            }
        
        return {
            "status": "success",
            "patterns": patterns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools/dating/preferences")
async def get_preferences():
    """Get current preference summary from analysis."""
    loader = get_training_loader()
    
    summary = loader.get_preference_summary()
    patterns = loader.get_patterns()
    
    return {
        "summary": summary,
        "patterns": patterns,
        "stats": loader.get_stats()
    }


@app.post("/tools/dating/sync-memory")
async def sync_preferences_to_memory(persona: str = Depends(require_tools_allowed)):
    """
    Sync preference analysis to Exocortex memory.
    Makes preferences available to Sovereign AI.
    """
    analyzer = get_preference_analyzer()
    
    try:
        # Ensure analysis is run
        patterns = analyzer.analyze_patterns()
        
        if patterns.get("status") == "insufficient_data":
            return {
                "status": "insufficient_data",
                "message": "Not enough training data for analysis"
            }
        
        # Generate summary and ingest to memory
        summary = analyzer.generate_preference_summary()
        doc_id = analyzer.ingest_to_memory()
        
        return {
            "status": "synced",
            "summary": summary,
            "memory_id": doc_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- SOCIAL TOOL ENDPOINTS ---
@app.post("/tools/social/post")
async def post_to_social(request: SocialPostRequest, persona: str = Depends(require_tools_allowed)):
    """
    Generate and post content to social media.
    
    If preview_only=True, only generates content without posting.
    """
    social = get_social_poster()
    
    logger.info(f"Social post request: topic='{request.topic}', platform={request.platform}, preview={request.preview_only}")
    
    # Check prerequisites (only if not preview)
    if not request.preview_only:
        ok, msg = social.check_prerequisites()
        if not ok:
            raise HTTPException(status_code=503, detail=msg)
    
    result = social.run(
        topic=request.topic,
        platform=request.platform,
        preview_only=request.preview_only
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    
    return result


@app.get("/tools/social/history")
async def get_social_history():
    """Get social posting history."""
    social = get_social_poster()
    return {
        "history": social.get_history(),
        "total_posts": len(social.history)
    }


@app.get("/tools/social/status")
async def get_social_status():
    """Get current social poster status."""
    social = get_social_poster()
    return social.get_status()


# --- INSTAGRAM TOOL ENDPOINTS ---
@app.post("/tools/instagram/post")
async def post_to_instagram(request: InstagramPostRequest, persona: str = Depends(require_tools_allowed)):
    """
    Upload and post an image to Instagram with auto-generated caption.
    
    Args:
        image_path: Path to the image file to post
        context: Context for caption generation (e.g., "Sunset flight over the mountains")
        preview_only: If True, only generates caption without posting
        
    Returns:
        Result with status, caption, and image info
    """
    instagram = get_instagram_poster()
    
    logger.info(f"Instagram post request: image='{request.image_path}', preview={request.preview_only}")
    
    # Check prerequisites (only if not preview)
    if not request.preview_only:
        ok, msg = instagram.check_prerequisites()
        if not ok:
            raise HTTPException(status_code=503, detail=msg)
    
    result = instagram.run(
        image_path=request.image_path,
        context=request.context,
        preview_only=request.preview_only
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    
    return result


@app.get("/tools/instagram/history")
async def get_instagram_history():
    """Get Instagram posting history."""
    instagram = get_instagram_poster()
    return {
        "history": instagram.get_history(),
        "total_posts": len(instagram.history)
    }


@app.get("/tools/instagram/status")
async def get_instagram_status():
    """Get current Instagram poster status."""
    instagram = get_instagram_poster()
    return instagram.get_status()


# =============================================================================
# WORKFLOW API - Unified Photo-to-Instagram Pipeline
# =============================================================================

# Get inoahphoto service URL from config
photo_service_config = get_service_config("inoahphoto")
PHOTO_SERVICE_URL = f"http://localhost:{photo_service_config.get('port', 8002)}"


@app.post("/workflow/photo-to-instagram")
async def photo_to_instagram_workflow(
    file: UploadFile = File(...),
    context: str = Form(...),
    process_face: bool = Form(True),
    preview_only: bool = Form(False)
):
    """
    Unified workflow: Upload -> Process -> Post to Instagram.
    
    This endpoint handles the complete pipeline:
    1. Uploads the photo to inoahphoto
    2. Optionally processes it with FaceFusion
    3. Posts to Instagram with auto-generated caption
    
    Args:
        file: The image file to upload
        context: Context for caption generation (e.g., "Sunset flight over Colorado")
        process_face: If True, process with FaceFusion before posting (default: True)
        preview_only: If True, only generate caption without posting
        
    Returns:
        Complete workflow result with upload, processing, and post status
    """
    logger.info(f"Starting photo-to-Instagram workflow for: {file.filename}")
    
    result = {
        "workflow": "photo-to-instagram",
        "steps": {}
    }
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        # Step 1: Upload to inoahphoto
        try:
            logger.info("Step 1: Uploading photo...")
            
            # Read file content
            file_content = await file.read()
            
            upload_response = await client.post(
                f"{PHOTO_SERVICE_URL}/upload",
                files={"file": (file.filename, file_content, file.content_type)}
            )
            
            if upload_response.status_code != 200:
                raise HTTPException(
                    status_code=upload_response.status_code,
                    detail=f"Upload failed: {upload_response.text}"
                )
            
            upload_data = upload_response.json()
            result["steps"]["upload"] = upload_data
            uploaded_path = upload_data["path"]
            logger.info(f"Upload complete: {uploaded_path}")
            
        except httpx.RequestError as e:
            logger.error(f"Upload request failed: {e}")
            raise HTTPException(status_code=503, detail=f"inoahphoto service unavailable: {e}")
        
        # Step 2: Process with FaceFusion (optional)
        final_image_path = uploaded_path
        
        if process_face:
            try:
                logger.info("Step 2: Processing with FaceFusion...")
                
                # Start processing
                process_response = await client.post(
                    f"{PHOTO_SERVICE_URL}/process",
                    json={"files": [Path(uploaded_path).name]}
                )
                
                if process_response.status_code != 200:
                    logger.warning(f"Processing failed: {process_response.text}")
                    result["steps"]["process"] = {"status": "failed", "message": process_response.text}
                else:
                    # Wait for processing to complete
                    max_wait = 120  # 2 minutes max
                    waited = 0
                    
                    while waited < max_wait:
                        status_response = await client.get(f"{PHOTO_SERVICE_URL}/status")
                        status_data = status_response.json()
                        
                        if not status_data.get("is_processing"):
                            break
                        
                        time.sleep(2)
                        waited += 2
                    
                    # Get the processed file path
                    output_filename = f"fixed_{Path(uploaded_path).name}"
                    output_dir = get_path("photo_output")
                    processed_path = output_dir / output_filename
                    
                    if processed_path.exists():
                        final_image_path = str(processed_path)
                        result["steps"]["process"] = {
                            "status": "success",
                            "output_path": final_image_path
                        }
                        logger.info(f"Processing complete: {final_image_path}")
                    else:
                        result["steps"]["process"] = {
                            "status": "skipped",
                            "message": "Output file not found, using original"
                        }
                        logger.warning("Processed file not found, using original")
                        
            except Exception as e:
                logger.warning(f"Processing step failed: {e}")
                result["steps"]["process"] = {"status": "error", "message": str(e)}
        else:
            result["steps"]["process"] = {"status": "skipped", "message": "Face processing disabled"}
        
        # Step 3: Post to Instagram
        logger.info("Step 3: Posting to Instagram...")
        instagram = get_instagram_poster()
        
        if not preview_only:
            ok, msg = instagram.check_prerequisites()
            if not ok:
                raise HTTPException(status_code=503, detail=msg)
        
        post_result = instagram.run(
            image_path=final_image_path,
            context=context,
            preview_only=preview_only
        )
        
        result["steps"]["instagram"] = post_result
        result["status"] = post_result.get("status", "unknown")
        result["final_image"] = final_image_path
        
        if post_result.get("caption"):
            result["caption"] = post_result["caption"]
        
        logger.info(f"Workflow complete: {result['status']}")
        
    return result


# =============================================================================
# MEMORY API - The Exocortex / Unified Memory Core
# =============================================================================

from inoahglobal.memory import MemoryStore, DocumentIngester
from inoahglobal.memory.store import get_memory_store


# --- MODELS FOR MEMORY ---
class MemoryQueryRequest(BaseModel):
    query: str
    collection: str = MemoryStore.COLLECTION_PROJECT
    n_results: int = 5


class MemoryAddRequest(BaseModel):
    text: str
    collection: str = MemoryStore.COLLECTION_PROJECT
    metadata: Optional[dict] = None


class MemoryIngestRequest(BaseModel):
    file_path: str
    collection: str = MemoryStore.COLLECTION_PROJECT
    clear_existing: bool = False


# --- MEMORY ENDPOINTS ---
@app.get("/memory/stats")
async def get_memory_stats():
    """Get statistics about the memory store."""
    try:
        store = get_memory_store()
        stats = store.get_stats()
        return {
            "status": "online",
            "collections": stats,
            "total_memories": sum(stats.values())
        }
    except Exception as e:
        logger.error(f"Memory stats error: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@app.post("/memory/query")
async def query_memory(request: MemoryQueryRequest):
    """
    Query the memory store using semantic search.
    Returns relevant memories based on the query.
    """
    logger.info(f"Memory query: {request.query[:50]}...")
    
    try:
        store = get_memory_store()
        results = store.query(
            query_text=request.query,
            collection=request.collection,
            n_results=request.n_results
        )
        
        return {
            "status": "success",
            "query": request.query,
            "collection": request.collection,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"Memory query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/add")
async def add_memory(request: MemoryAddRequest):
    """
    Add a new memory to the store.
    """
    logger.info(f"Adding memory to {request.collection}...")
    
    try:
        store = get_memory_store()
        doc_id = store.add_memory(
            text=request.text,
            collection=request.collection,
            metadata=request.metadata
        )
        
        return {
            "status": "success",
            "id": doc_id,
            "collection": request.collection
        }
    except Exception as e:
        logger.error(f"Memory add error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/ingest")
async def ingest_document(
    request: MemoryIngestRequest,
    background_tasks: BackgroundTasks
):
    """
    Ingest a document file into the memory store.
    Runs in background for large files.
    """
    logger.info(f"Ingesting {request.file_path}...")
    
    # Verify file exists
    from pathlib import Path
    if not Path(request.file_path).exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
    
    def run_ingestion():
        try:
            ingester = DocumentIngester(chunk_size=1500, chunk_overlap=300)
            chunks = ingester.ingest_file(
                request.file_path,
                collection=request.collection,
                clear_existing=request.clear_existing
            )
            logger.info(f"Ingestion complete: {chunks} chunks")
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
    
    background_tasks.add_task(run_ingestion)
    
    return {
        "status": "started",
        "file": request.file_path,
        "collection": request.collection,
        "message": "Ingestion started in background"
    }


@app.get("/memory/context")
async def get_relevant_context(query: str, max_tokens: int = 2000):
    """
    Get relevant context for a query, formatted for LLM injection.
    This is what the chat uses internally for RAG.
    """
    try:
        store = get_memory_store()
        context = store.get_relevant_context(query, max_tokens=max_tokens)
        
        return {
            "status": "success",
            "query": query,
            "context": context,
            "context_length": len(context)
        }
    except Exception as e:
        logger.error(f"Context retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("iNoah Brain - The Voice")
    logger.info(f"Starting on {HOST}:{PORT}")
    logger.info("=" * 50)
    
    # Auto-initialize memory (identity facts + project docs)
    try:
        from inoahglobal.memory import ensure_memory_initialized
        ensure_memory_initialized()
    except Exception as e:
        logger.warning(f"Memory initialization skipped: {e}")
    
    uvicorn.run(app, host=HOST, port=PORT)
