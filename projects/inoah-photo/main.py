"""
iNoah Photo - The Face
Photo processing service using FaceFusion for face swapping and enhancement.
"""

import sys
import subprocess
import uuid
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Security, File, UploadFile, BackgroundTasks
from fastapi.security.api_key import APIKeyHeader
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Add inoah-core to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "inoah-core" / "src"))

from inoah_core import get_logger, get_service_config, get_api_secret, get_path

# Service configuration
SERVICE_NAME = "inoah-photo"
service_config = get_service_config(SERVICE_NAME)
PORT = service_config.get("port", 8002)

# Setup
logger = get_logger(SERVICE_NAME)
api_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)

# Directories
SCRIPT_DIR = Path(__file__).parent
try:
    RAW_FOLDER = get_path("photo_raw")
    if not RAW_FOLDER.is_absolute():
        RAW_FOLDER = SCRIPT_DIR / "raw_photos"
except Exception:
    RAW_FOLDER = SCRIPT_DIR / "raw_photos"

try:
    OUTPUT_FOLDER = get_path("photo_output")
    if not OUTPUT_FOLDER.is_absolute():
        OUTPUT_FOLDER = SCRIPT_DIR / "output"
except Exception:
    OUTPUT_FOLDER = SCRIPT_DIR / "output"

try:
    REF_FOLDER = get_path("reference_faces")
    if not REF_FOLDER.is_absolute():
        REF_FOLDER = SCRIPT_DIR / "reference_faces"
except Exception:
    REF_FOLDER = SCRIPT_DIR / "reference_faces"

FACEFUSION_DIR = SCRIPT_DIR / "facefusion"
FACEFUSION_SCRIPT = FACEFUSION_DIR / "facefusion.py"

# Ensure directories exist
RAW_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
REF_FOLDER.mkdir(parents=True, exist_ok=True)

# Job tracking
jobs = {}


# Request/Response models
class ProcessRequest(BaseModel):
    input_filename: str
    output_filename: Optional[str] = None


class BatchProcessRequest(BaseModel):
    input_filenames: List[str]


class JobStatus(BaseModel):
    job_id: str
    status: str
    input_file: str
    output_file: Optional[str] = None
    error: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None


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
    logger.info(f"iNoah Photo (The Face) Starting")
    logger.info(f"Port: {PORT}")
    logger.info(f"Raw: {RAW_FOLDER}")
    logger.info(f"Output: {OUTPUT_FOLDER}")
    logger.info(f"References: {REF_FOLDER}")
    logger.info("=" * 50)
    yield
    logger.info("iNoah Photo shutting down...")


# FastAPI App
app = FastAPI(
    title="iNoah Photo",
    description="The Face - Photo processing with FaceFusion",
    version="2.0.0",
    lifespan=lifespan
)


# Helper functions
def get_reference_images() -> List[Path]:
    """Get all reference face images."""
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    images = []
    
    for file in REF_FOLDER.iterdir():
        if file.suffix.lower() in extensions and file.is_file():
            images.append(file)
    
    return sorted(images)


def build_facefusion_command(
    source_images: List[Path],
    target_image: Path,
    output_path: Path
) -> List[str]:
    """Build the FaceFusion CLI command."""
    cmd = [
        sys.executable,
        str(FACEFUSION_SCRIPT),
        "headless-run",
    ]
    
    cmd.append("-s")
    for source in source_images:
        cmd.append(str(source.absolute()))
    
    cmd.extend([
        "-t", str(target_image.absolute()),
        "-o", str(output_path.absolute()),
    ])
    
    return cmd


def process_image_sync(
    input_path: Path,
    output_path: Path,
    job_id: str
) -> bool:
    """Process a single image with FaceFusion."""
    source_images = get_reference_images()
    
    if not source_images:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = "No reference images found"
        return False
    
    cmd = build_facefusion_command(source_images, input_path, output_path)
    
    logger.info(f"Processing: {input_path.name}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(FACEFUSION_DIR)
        )
        
        if result.returncode != 0:
            error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = error_msg[:500]
            jobs[job_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"
            return False
        
        if output_path.exists():
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["output_file"] = str(output_path)
            jobs[job_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"
            logger.info(f"Saved: {output_path.name}")
            return True
        else:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = "Output not created"
            jobs[job_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"
            return False
            
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"
        logger.error(f"Exception: {e}")
        return False


# =============================================================================
# Health
# =============================================================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    facefusion_available = FACEFUSION_SCRIPT.exists()
    ref_count = len(get_reference_images())
    
    return {
        "status": "healthy" if facefusion_available else "degraded",
        "service": SERVICE_NAME,
        "facefusion_available": facefusion_available,
        "reference_images": ref_count,
        "raw_folder": str(RAW_FOLDER),
        "output_folder": str(OUTPUT_FOLDER)
    }


# =============================================================================
# Processing
# =============================================================================

@app.post("/process")
async def process_image(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Security(verify_api_key)
):
    """Process a single image."""
    input_path = RAW_FOLDER / request.input_filename
    
    if not input_path.exists():
        raise HTTPException(status_code=404, detail=f"Input file not found: {request.input_filename}")
    
    output_filename = request.output_filename or f"fixed_{request.input_filename}"
    output_path = OUTPUT_FOLDER / output_filename
    
    job_id = str(uuid.uuid4())[:8]
    
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "input_file": str(input_path),
        "output_file": None,
        "error": None,
        "started_at": datetime.utcnow().isoformat() + "Z",
        "completed_at": None
    }
    
    background_tasks.add_task(process_image_sync, input_path, output_path, job_id)
    
    return {
        "job_id": job_id,
        "status": "processing",
        "input": request.input_filename,
        "output": output_filename
    }


@app.post("/process/upload")
async def process_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    api_key: str = Security(verify_api_key)
):
    """Upload and process an image."""
    # Save uploaded file
    input_path = RAW_FOLDER / file.filename
    with open(input_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    output_filename = f"fixed_{file.filename}"
    output_path = OUTPUT_FOLDER / output_filename
    
    job_id = str(uuid.uuid4())[:8]
    
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "input_file": str(input_path),
        "output_file": None,
        "error": None,
        "started_at": datetime.utcnow().isoformat() + "Z",
        "completed_at": None
    }
    
    background_tasks.add_task(process_image_sync, input_path, output_path, job_id)
    
    return {
        "job_id": job_id,
        "status": "processing",
        "filename": file.filename
    }


@app.post("/batch")
async def batch_process(
    request: BatchProcessRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Security(verify_api_key)
):
    """Process multiple images."""
    job_ids = []
    
    for filename in request.input_filenames:
        input_path = RAW_FOLDER / filename
        
        if not input_path.exists():
            continue
        
        output_path = OUTPUT_FOLDER / f"fixed_{filename}"
        job_id = str(uuid.uuid4())[:8]
        
        jobs[job_id] = {
            "job_id": job_id,
            "status": "processing",
            "input_file": str(input_path),
            "output_file": None,
            "error": None,
            "started_at": datetime.utcnow().isoformat() + "Z",
            "completed_at": None
        }
        
        background_tasks.add_task(process_image_sync, input_path, output_path, job_id)
        job_ids.append(job_id)
    
    return {
        "job_ids": job_ids,
        "total": len(job_ids)
    }


# =============================================================================
# Jobs
# =============================================================================

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job status."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]


@app.get("/jobs")
async def list_jobs():
    """List all jobs."""
    return {"jobs": list(jobs.values())}


# =============================================================================
# Files
# =============================================================================

@app.get("/output/{filename}")
async def get_output(filename: str, api_key: str = Security(verify_api_key)):
    """Download an output file."""
    output_path = OUTPUT_FOLDER / filename
    
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(output_path)


@app.get("/references")
async def list_references():
    """List reference images."""
    refs = get_reference_images()
    return {"references": [r.name for r in refs]}


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
