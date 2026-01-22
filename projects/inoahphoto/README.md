# iNoahPhoto

AI-powered batch photo processor that enhances faces using face swapping and GFPGAN restoration.

## What It Does

1. **Builds a Master Face** — Analyzes reference photos to create an averaged facial embedding
2. **Culls Bad Photos** — Automatically skips blurry or too-dark images
3. **Face Swap** — Applies the master embedding to all detected faces
4. **Face Enhancement** — Uses GFPGAN to restore and enhance facial details

## Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

1. Add your best reference photos to `reference_faces/`
2. Add photos to process in `raw_photos/`
3. Run the processor:

```bash
python process.py
```

4. Find enhanced photos in `output/`

## Configuration

Edit these values in `process.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `BLUR_THRESHOLD` | 100 | Higher = stricter blur detection |
| `ENABLE_FACE_ENHANCE` | True | Toggle GFPGAN enhancement |
| `UPSCALE_FACTOR` | 1 | 1 = same size, 2 = 2x upscale |

## Project Structure

```
├── reference_faces/   # Your best photos (builds master face)
├── raw_photos/        # Photos to process
├── output/            # Enhanced results
├── models/            # GFPGAN model weights
└── process.py         # Main script
```

## Requirements

- Python 3.10+
- ~2GB disk space for models (downloaded on first run)


