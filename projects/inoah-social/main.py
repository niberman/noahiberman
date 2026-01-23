"""
iNoah Social - The Creator
Automated social media posting with AI-generated content.
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, Literal

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import get_logger, get_service_config, get_api_secret

from twitter_poster import get_twitter_poster
from instagram_poster import get_instagram_poster

# Service configuration
SERVICE_NAME = "inoah-social"
service_config = get_service_config(SERVICE_NAME)
PORT = service_config.get("port", 8011)

# Setup
logger = get_logger(SERVICE_NAME)
api_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)


# Request/Response models
class UnifiedPostRequest(BaseModel):
    platform: Literal["twitter", "x", "instagram"]
    topic: Optional[str] = None  # For Twitter
    image_path: Optional[str] = None  # For Instagram
    context: Optional[str] = None  # For Instagram caption
    preview_only: bool = False


class TwitterPostRequest(BaseModel):
    topic: str
    preview_only: bool = False


class InstagramPostRequest(BaseModel):
    image_path: str
    context: str
    preview_only: bool = False


class PreviewRequest(BaseModel):
    platform: Literal["twitter", "x", "instagram"]
    topic: Optional[str] = None
    context: Optional[str] = None
    image_path: Optional[str] = None


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
    logger.info(f"iNoah Social (The Creator) Starting")
    logger.info(f"Port: {PORT}")
    logger.info("=" * 50)
    yield
    logger.info("iNoah Social shutting down...")


# FastAPI App
app = FastAPI(
    title="iNoah Social",
    description="The Creator - Automated social media posting",
    version="2.0.0",
    lifespan=lifespan
)


# =============================================================================
# Health & Status
# =============================================================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    twitter = get_twitter_poster()
    instagram = get_instagram_poster()
    
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "twitter_posts": len(twitter.history),
        "instagram_posts": len(instagram.history)
    }


@app.get("/status")
async def status():
    """Get service status."""
    twitter = get_twitter_poster()
    instagram = get_instagram_poster()
    
    return {
        "twitter": twitter.get_status(),
        "instagram": instagram.get_status()
    }


@app.get("/history")
async def history():
    """Get all posting history."""
    twitter = get_twitter_poster()
    instagram = get_instagram_poster()
    
    return {
        "twitter": twitter.get_history(),
        "instagram": instagram.get_history()
    }


# =============================================================================
# Unified Posting
# =============================================================================

@app.post("/post")
async def unified_post(
    request: UnifiedPostRequest,
    api_key: str = Security(verify_api_key)
):
    """
    Unified posting endpoint for any platform.
    """
    if request.platform in ["twitter", "x"]:
        if not request.topic:
            raise HTTPException(status_code=400, detail="topic required for Twitter")
        
        twitter = get_twitter_poster()
        return twitter.run(
            topic=request.topic,
            preview_only=request.preview_only
        )
    
    elif request.platform == "instagram":
        if not request.image_path or not request.context:
            raise HTTPException(
                status_code=400,
                detail="image_path and context required for Instagram"
            )
        
        instagram = get_instagram_poster()
        return instagram.run(
            image_path=request.image_path,
            context=request.context,
            preview_only=request.preview_only
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {request.platform}")


@app.post("/preview")
async def preview(
    request: PreviewRequest,
    api_key: str = Security(verify_api_key)
):
    """
    Preview generated content without posting.
    """
    if request.platform in ["twitter", "x"]:
        if not request.topic:
            raise HTTPException(status_code=400, detail="topic required for Twitter")
        
        twitter = get_twitter_poster()
        return twitter.generate_content_only(request.topic)
    
    elif request.platform == "instagram":
        if not request.context:
            raise HTTPException(status_code=400, detail="context required for Instagram")
        
        instagram = get_instagram_poster()
        return instagram.generate_caption_only(request.context, request.image_path)
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {request.platform}")


# =============================================================================
# Twitter/X Endpoints
# =============================================================================

@app.post("/twitter/post")
async def twitter_post(
    request: TwitterPostRequest,
    api_key: str = Security(verify_api_key)
):
    """Post to Twitter/X."""
    twitter = get_twitter_poster()
    return twitter.run(
        topic=request.topic,
        preview_only=request.preview_only
    )


@app.post("/twitter/preview")
async def twitter_preview(
    topic: str,
    api_key: str = Security(verify_api_key)
):
    """Preview generated tweet without posting."""
    twitter = get_twitter_poster()
    return twitter.generate_content_only(topic)


@app.get("/twitter/history")
async def twitter_history():
    """Get Twitter posting history."""
    twitter = get_twitter_poster()
    return {"history": twitter.get_history()}


# =============================================================================
# Instagram Endpoints
# =============================================================================

@app.post("/instagram/post")
async def instagram_post(
    request: InstagramPostRequest,
    api_key: str = Security(verify_api_key)
):
    """Post to Instagram."""
    instagram = get_instagram_poster()
    return instagram.run(
        image_path=request.image_path,
        context=request.context,
        preview_only=request.preview_only
    )


@app.post("/instagram/preview")
async def instagram_preview(
    context: str,
    image_path: Optional[str] = None,
    api_key: str = Security(verify_api_key)
):
    """Preview generated Instagram caption without posting."""
    instagram = get_instagram_poster()
    return instagram.generate_caption_only(context, image_path)


@app.get("/instagram/history")
async def instagram_history():
    """Get Instagram posting history."""
    instagram = get_instagram_poster()
    return {"history": instagram.get_history()}


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
