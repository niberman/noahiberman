# iNoah Dating - The Wingman

Automated dating app swiping using vision AI and learned preferences.

## Features

- Vision-based profile analysis
- Learned preference integration from training data
- Human-like behavior with randomized delays and session breaks
- Support for browser-based automation via inoah-hands
- Preference training data recording and analysis

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install inoah-core for shared utilities
pip install -e ../inoah-core
```

## Usage

```bash
# Start the service
uvicorn main:app --host 0.0.0.0 --port 8010
```

## API Endpoints

- `POST /swipe/start` - Start automated swiping
- `POST /swipe/stop` - Stop swiping
- `GET /swipe/status` - Get current status and stats
- `POST /swipe/single` - Run a single swipe cycle

### Training Data

- `POST /training/start` - Start recording session
- `POST /training/record` - Record a labeled sample
- `POST /training/end` - End recording session
- `POST /training/analyze` - Analyze preference patterns
- `GET /training/stats` - Get training data statistics

## Configuration

Configure via `inoah-core/config.json`:

```json
{
  "services": {
    "inoah-dating": {
      "port": 8010,
      "host": "0.0.0.0"
    }
  },
  "dating": {
    "humanize": {
      "swipe_delay_min_ms": 1500,
      "swipe_delay_max_ms": 8000
    }
  }
}
```
