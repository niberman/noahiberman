# iNoah Social - The Creator

Automated social media posting with AI-generated content.

## Features

- AI-powered content generation with identity and style preservation
- X/Twitter automated posting
- Instagram photo posting with AI captions
- Preview mode for content review before posting
- Post history tracking

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
uvicorn main:app --host 0.0.0.0 --port 8011
```

## API Endpoints

### Unified Posting

- `POST /post` - Post to any platform
- `POST /preview` - Generate content without posting

### Twitter/X

- `POST /twitter/post` - Post a tweet
- `POST /twitter/preview` - Preview generated tweet

### Instagram

- `POST /instagram/post` - Post an image with generated caption
- `POST /instagram/preview` - Preview generated caption

### Status

- `GET /health` - Service health check
- `GET /history` - Get posting history
- `GET /status` - Get current status

## Configuration

Configure via `inoah-core/config.json`:

```json
{
  "services": {
    "inoah-social": {
      "port": 8011,
      "host": "0.0.0.0"
    }
  },
  "identity": {
    "style_rules": [
      "No emojis",
      "Technical precision",
      "Blunt tone"
    ]
  }
}
```
