# Server Agent

Remote server control daemon for Command Center. Deploy this on your server and expose it through your Cloudflare tunnel.

## Quick Start

```bash
# Install dependencies
npm install

# Create config
cp .env.example .env
# Edit .env and set your API_KEY

# Development
npm run dev

# Production
npm run build
npm start
```

## Configuration

Create a `.env` file:

```bash
# Required: API key for authentication
API_KEY=your-secure-api-key-here

# Port (default: 3000)
PORT=3000

# Enable specific plugins (default: all)
ENABLED_PLUGINS=system,docker,services,logs,shell,linkedin

# Restrict shell commands (empty = allow all)
ALLOWED_COMMANDS=ls,cat,grep,tail,head,df,free,ps,top

# Log file paths to expose
LOG_PATHS=/var/log/syslog,/var/log/auth.log
```

## Your Setup

Server accessible at:
- **Public**: `https://agents.noahiberman.com` (via Cloudflare tunnel)
- **Local**: `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - No auth required

### System (`/api/system`)
- `GET /` - Full system status (CPU, memory, disk, uptime)
- `GET /cpu` - CPU details
- `GET /memory` - Memory usage
- `GET /disk` - Disk usage
- `GET /network` - Network interfaces and stats
- `GET /processes` - Running processes

### Docker (`/api/docker`)
- `GET /containers` - List all containers
- `GET /containers/:id` - Container details
- `POST /containers/:id/start` - Start container
- `POST /containers/:id/stop` - Stop container
- `POST /containers/:id/restart` - Restart container
- `GET /containers/:id/logs?tail=100` - Container logs
- `GET /images` - List images
- `GET /info` - Docker system info

### Services (`/api/services`)
- `GET /` - List all services
- `GET /:name` - Service status
- `POST /:name/start` - Start service
- `POST /:name/stop` - Stop service
- `POST /:name/restart` - Restart service
- `POST /:name/enable` - Enable service
- `POST /:name/disable` - Disable service

### Logs (`/api/logs`)
- `GET /` - List available log files
- `GET /read?path=/var/log/syslog&lines=100` - Read log file
- `GET /search?path=/var/log/syslog&pattern=error` - Search logs
- `GET /journal?unit=nginx&lines=100` - Journalctl logs
- `GET /dmesg` - Kernel logs

### Shell (`/api/shell`)
- `POST /exec` - Execute command `{ "command": "ls -la" }`
- `GET /history` - Command history
- `DELETE /history` - Clear history
- `GET /env` - Environment info
- `GET /quick/:action` - Quick commands (uptime, df, free, etc.)

## Authentication

All endpoints (except `/health`) require the `Authorization` header:

```
Authorization: Bearer your-api-key
```

## Running as a Service

Create `/etc/systemd/system/server-agent.service`:

```ini
[Unit]
Description=Command Center Server Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/server-agent
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable server-agent
sudo systemctl start server-agent
```

### LinkedIn (`/api/linkedin`)

Browser-based LinkedIn automation using Playwright.

- `GET /status` - Connection status (logged in, queue length, etc.)
- `POST /login` - Login with credentials `{ "email": "...", "password": "..." }`
- `POST /logout` - Disconnect LinkedIn
- `POST /post` - Post immediately `{ "content": "..." }`
- `POST /schedule` - Schedule post `{ "content": "...", "scheduledFor": "ISO date" }`
- `GET /queue` - Get scheduled posts
- `GET /history` - Get post history
- `DELETE /queue/:id` - Cancel scheduled post

**Note:** LinkedIn login sessions are persisted via cookies. The first login may require verification.

---

## Adding Custom Plugins

Create a new file in `src/plugins/`:

```typescript
import { Router } from 'express';
import type { Plugin } from '../types.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello from my plugin!' });
});

const plugin: Plugin = {
  name: 'myplugin',
  description: 'My custom plugin',
  routes: router,
  init: async () => {
    console.log('  → My plugin initialized');
  },
};

export default plugin;
```

Add `myplugin` to `ENABLED_PLUGINS` in your `.env`.

