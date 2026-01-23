# iNoah Photo - The Face

Photo processing service using FaceFusion for face swapping and enhancement.

## Features

- Face swap using reference images
- Face enhancement with GPEN-BFR-512
- Batch processing support
- Job queue for async processing

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install FaceFusion (in facefusion subdirectory)
# See FaceFusion documentation for setup

# Install inoah-core for shared utilities
pip install -e ../inoah-core
```

## Usage

```bash
# Start the service
uvicorn main:app --host 0.0.0.0 --port 8002
```

## API Endpoints

- `POST /process` - Process a single image
- `POST /batch` - Process multiple images
- `GET /jobs/{job_id}` - Get job status
- `GET /jobs` - List all jobs
- `GET /health` - Service health check

## Directory Structure

```
inoah-photo/
├── raw_photos/        # Input photos to process
├── reference_faces/   # Reference face images
├── output/            # Processed output images
├── facefusion/        # FaceFusion installation
└── main.py            # FastAPI service
```

## Configuration

Configure via `inoah-core/config.json`:

```json
{
  "services": {
    "inoah-photo": {
      "port": 8002,
      "host": "0.0.0.0"
    }
  },
  "paths": {
    "photo_raw": "../inoah-photo/raw_photos",
    "photo_output": "../inoah-photo/output",
    "reference_faces": "../inoah-photo/reference_faces"
  }
}
```
