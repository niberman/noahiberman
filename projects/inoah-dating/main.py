"""
iNoah Dating - The Wingman
Automated dating app profile swiping with AI analysis and learned preferences.
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Security, BackgroundTasks
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from typing import Optional

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import get_logger, get_service_config, get_api_secret

from automator import get_dating_automator
from message_responder import get_message_responder
from training_recorder import get_training_recorder
from preference_analyzer import get_preference_analyzer
from training_loader import get_training_loader

# Service configuration
SERVICE_NAME = "inoah-dating"
service_config = get_service_config(SERVICE_NAME)
PORT = service_config.get("port", 8010)

# Setup
logger = get_logger(SERVICE_NAME)
api_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)


# Request/Response models
class SwipeStartRequest(BaseModel):
    max_swipes: Optional[int] = None


class MessagesStartRequest(BaseModel):
    max_responses: Optional[int] = None


class TrainingRecordRequest(BaseModel):
    label: str  # "LIKE" or "PASS"
    thinking_time_ms: Optional[int] = None


class TrainingStartRequest(BaseModel):
    backend: str = "browser"
    platform: str = "tinder"


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
    logger.info(f"iNoah Dating (The Wingman) Starting")
    logger.info(f"Port: {PORT}")
    logger.info("=" * 50)
    yield
    logger.info("iNoah Dating shutting down...")


# FastAPI App
app = FastAPI(
    title="iNoah Dating",
    description="The Wingman - Automated dating with AI analysis",
    version="2.0.0",
    lifespan=lifespan
)


# =============================================================================
# Health
# =============================================================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    automator = get_dating_automator()
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "running": automator.is_running,
        "stats": automator.get_status()
    }


# =============================================================================
# Swiping Endpoints
# =============================================================================

@app.post("/swipe/start")
async def swipe_start(
    request: SwipeStartRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Security(verify_api_key)
):
    """
    Start automated swiping in the background.
    """
    automator = get_dating_automator()
    
    if automator.is_running:
        raise HTTPException(status_code=409, detail="Swiping already in progress")
    
    # Run in background
    background_tasks.add_task(
        automator.run,
        max_swipes=request.max_swipes
    )
    
    return {
        "status": "started",
        "max_swipes": request.max_swipes
    }


@app.post("/swipe/stop")
async def swipe_stop(api_key: str = Security(verify_api_key)):
    """Stop automated swiping."""
    automator = get_dating_automator()
    result = automator.stop()
    return result


@app.get("/swipe/status")
async def swipe_status():
    """Get current swiping status and statistics."""
    automator = get_dating_automator()
    return automator.get_status()


@app.post("/swipe/single")
async def swipe_single(api_key: str = Security(verify_api_key)):
    """
    Run a single swipe cycle.
    Useful for testing or manual control.
    """
    automator = get_dating_automator()
    result = automator.run_single_swipe()
    return result


@app.post("/swipe/reset")
async def swipe_reset(api_key: str = Security(verify_api_key)):
    """Reset swipe statistics."""
    automator = get_dating_automator()
    automator.reset_stats()
    return {"status": "reset", "stats": automator.get_status()}


# =============================================================================
# Messaging Endpoints
# =============================================================================

@app.post("/messages/start")
async def messages_start(
    request: MessagesStartRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Security(verify_api_key)
):
    """
    Start automated message responding in the background.
    Analyzes profiles and conversations to generate personalized replies.
    """
    responder = get_message_responder()
    
    if responder.is_running:
        raise HTTPException(status_code=409, detail="Message responder already running")
    
    # Run in background
    background_tasks.add_task(
        responder.run,
        max_responses=request.max_responses
    )
    
    return {
        "status": "started",
        "max_responses": request.max_responses
    }


@app.post("/messages/stop")
async def messages_stop(api_key: str = Security(verify_api_key)):
    """Stop the message responder."""
    responder = get_message_responder()
    result = responder.stop()
    return result


@app.get("/messages/status")
async def messages_status():
    """Get message responder status and statistics."""
    responder = get_message_responder()
    return responder.get_status()


@app.post("/messages/respond")
async def messages_respond_single(api_key: str = Security(verify_api_key)):
    """
    Respond to a single conversation.
    Useful for testing or manual control.
    """
    responder = get_message_responder()
    
    # Launch browser if needed
    if not responder.browser.is_launched:
        result = responder.browser.launch(responder.MESSAGES_URL)
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail="Failed to launch browser")
    
    result = responder.respond_single()
    return result


@app.post("/messages/reset")
async def messages_reset(api_key: str = Security(verify_api_key)):
    """Reset message responder statistics."""
    responder = get_message_responder()
    responder.reset_stats()
    return {"status": "reset", "stats": responder.get_status()}


# =============================================================================
# Training Data Endpoints
# =============================================================================

@app.post("/training/start")
async def training_start(
    request: TrainingStartRequest,
    api_key: str = Security(verify_api_key)
):
    """Start a new training data recording session."""
    recorder = get_training_recorder()
    session_id = recorder.start_session(
        backend=request.backend,
        platform=request.platform
    )
    return {"status": "started", "session_id": session_id}


@app.post("/training/record")
async def training_record(
    request: TrainingRecordRequest,
    api_key: str = Security(verify_api_key)
):
    """
    Record a labeled training sample.
    Gets screenshot from browser and stores with label.
    """
    recorder = get_training_recorder()
    
    if not recorder.is_recording:
        raise HTTPException(status_code=400, detail="No active recording session")
    
    # Get screenshot from automator
    automator = get_dating_automator()
    screenshot = automator.get_screenshot()
    
    # Record the sample
    sample = recorder.record_sample(
        screenshot=screenshot,
        label=request.label,
        thinking_time_ms=request.thinking_time_ms
    )
    
    return {"status": "recorded", "sample": sample}


@app.post("/training/end")
async def training_end(
    auto_analyze: bool = True,
    api_key: str = Security(verify_api_key)
):
    """End the current recording session."""
    recorder = get_training_recorder()
    summary = recorder.end_session(auto_analyze=auto_analyze)
    return summary


@app.get("/training/stats")
async def training_stats():
    """Get training data statistics."""
    loader = get_training_loader()
    return loader.get_stats()


@app.get("/training/sessions")
async def training_sessions():
    """Get list of all recording sessions."""
    loader = get_training_loader()
    return {"sessions": loader.get_sessions()}


@app.post("/training/analyze")
async def training_analyze(
    min_samples: int = 10,
    api_key: str = Security(verify_api_key)
):
    """
    Analyze training data to extract preference patterns.
    Optionally syncs to memory.
    """
    analyzer = get_preference_analyzer()
    patterns = analyzer.analyze_patterns(min_samples=min_samples)
    
    if patterns.get("status") == "insufficient_data":
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {min_samples} samples for analysis"
        )
    
    return patterns


@app.get("/training/preferences")
async def training_preferences():
    """Get the current preference summary."""
    loader = get_training_loader()
    summary = loader.get_preference_summary()
    patterns = loader.get_patterns()
    
    return {
        "summary": summary,
        "patterns": patterns
    }


@app.post("/training/sync")
async def training_sync(api_key: str = Security(verify_api_key)):
    """
    Sync preference analysis to Exocortex memory.
    Updates what the AI knows about user's dating preferences.
    """
    analyzer = get_preference_analyzer()
    
    # Generate summary if not already done
    summary = analyzer.generate_preference_summary()
    
    # Ingest to memory
    doc_id = analyzer.ingest_to_memory()
    
    return {
        "status": "synced" if doc_id else "failed",
        "doc_id": doc_id,
        "summary": summary
    }


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
