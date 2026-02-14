# iNoah Sovereign Chat

Self-hosted AI chat interface powered by [Open WebUI](https://github.com/open-webui/open-webui) and [LM Studio](https://lmstudio.ai/), exposed publicly via a Cloudflare Tunnel at `chat.noahiberman.com`.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2)
- [LM Studio](https://lmstudio.ai/) installed on your host machine
- A [Cloudflare](https://www.cloudflare.com/) account with your domain configured (for the tunnel)

## LM Studio Setup

1. Open **LM Studio** on your Mac/PC.
2. Download a model (e.g. Llama 3, Mistral, Phi-3) from the Discover tab.
3. Navigate to the **Developer** tab (the double-headed arrow icon `<->` in the left sidebar).
4. Click **Start Server**.
5. Confirm the server port is **1234** (this is the default).
6. **Enable "Cross-Origin Resource Sharing (CORS)"** — this toggle is in the Developer tab settings. Docker containers need CORS to communicate with the host.

Once the server is running, you should see `Listening on port 1234` in LM Studio.

## Quick Start

```bash
# Navigate to this directory
cd infrastructure/chat

# Copy the example env file and fill in your secrets
cp .env.chat.example .env.chat

# Generate a secure secret key
openssl rand -hex 32
# Paste the output as the WEBUI_SECRET_KEY value in .env.chat

# Start the services
docker compose up -d

# Verify everything is running
docker compose ps
```

Open WebUI will be available at **http://localhost:3000**.

On first visit, you'll create an admin account — this account is stored locally in the `./data` volume.

## Cloudflare Tunnel Setup

The `cloudflared` sidecar service exposes your local Open WebUI at `chat.noahiberman.com`.

### 1. Create a Tunnel

```bash
# Install cloudflared (if not already installed)
brew install cloudflared

# Authenticate with Cloudflare
cloudflared tunnel login

# Create a new tunnel
cloudflared tunnel create inoah-chat
```

### 2. Get the Tunnel Token

```bash
# List tunnels to find the ID
cloudflared tunnel list

# Get the token for your tunnel
cloudflared tunnel token inoah-chat
```

Copy the token and set it as `TUNNEL_TOKEN` in your `.env.chat` file.

### 3. Configure the Tunnel

In the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/):

1. Go to **Networks** > **Tunnels**.
2. Select your `inoah-chat` tunnel.
3. Add a **Public Hostname**:
   - **Subdomain:** `chat`
   - **Domain:** `noahiberman.com`
   - **Service:** `http://open-webui:8080`

### 4. DNS

Ensure a **CNAME** record exists:

| Type  | Name   | Target                                  |
|-------|--------|-----------------------------------------|
| CNAME | `chat` | `<tunnel-id>.cfargotunnel.com` |

This is usually created automatically when you add the public hostname in the dashboard.

## Adding External API Providers

LM Studio provides local models, but you can also connect cloud providers through the Open WebUI admin settings:

1. Open **http://localhost:3000** and sign in as admin.
2. Go to **Admin Panel** > **Settings** > **Connections**.
3. Add your API keys for:
   - **OpenAI** (GPT-4, etc.)
   - **Anthropic** (Claude)
   - **Google** (Gemini)

Alternatively, set the keys in `.env.chat` before starting the services.

## Common Commands

```bash
# Start services in background
docker compose up -d

# View logs (follow mode)
docker compose logs -f

# View logs for a specific service
docker compose logs -f open-webui

# Stop services
docker compose down

# Stop and remove volumes (WARNING: deletes chat history)
docker compose down -v

# Rebuild with latest image
docker compose pull && docker compose up -d
```

## Persistent Data

All chat history, user accounts, and configuration are stored in the `./data` directory, which is mounted as a Docker volume. This directory is git-ignored.

To back up your data:

```bash
tar -czf inoah-chat-backup-$(date +%Y%m%d).tar.gz data/
```

## Troubleshooting

**"Could not connect to LM Studio"**
- Ensure LM Studio's server is running (Developer tab > Start Server).
- Confirm the port is 1234.
- Verify CORS is enabled in LM Studio.
- Check that Docker Desktop is running and `host.docker.internal` resolves correctly.

**Open WebUI shows no models**
- LM Studio must have at least one model loaded. Go to LM Studio's Developer tab and load a model.

**Cloudflare tunnel not connecting**
- Verify `TUNNEL_TOKEN` is set correctly in `.env.chat`.
- Check tunnel status: `docker compose logs cloudflared`.
- Ensure the tunnel exists: `cloudflared tunnel list`.
