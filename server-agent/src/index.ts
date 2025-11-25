import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin, PluginModule } from './types.js';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const ENABLED_PLUGINS = (process.env.ENABLED_PLUGINS || 'system,docker,services,logs,shell,linkedin').split(',');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://noahiberman.com',
    'https://www.noahiberman.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// API Key authentication
app.use((req, res, next) => {
  // Allow health check without auth
  if (req.path === '/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const providedKey = authHeader?.replace('Bearer ', '');

  if (!API_KEY) {
    console.warn('WARNING: No API_KEY set. Server is running without authentication!');
    return next();
  }

  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Plugin loader
async function loadPlugins(): Promise<Plugin[]> {
  const plugins: Plugin[] = [];
  const pluginsDir = join(__dirname, 'plugins');

  try {
    const files = readdirSync(pluginsDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));

    for (const file of files) {
      const pluginName = file.replace(/\.(js|ts)$/, '');
      
      if (!ENABLED_PLUGINS.includes(pluginName)) {
        console.log(`⏭️  Skipping disabled plugin: ${pluginName}`);
        continue;
      }

      try {
        const pluginPath = join(pluginsDir, file);
        const module = await import(pluginPath) as PluginModule;
        const plugin = module.default;

        if (plugin.init) {
          await plugin.init();
        }

        app.use(`/api/${plugin.name}`, plugin.routes);
        plugins.push(plugin);
        console.log(`✅ Loaded plugin: ${plugin.name} - ${plugin.description}`);
      } catch (err) {
        console.error(`❌ Failed to load plugin ${pluginName}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Failed to read plugins directory:', err);
  }

  return plugins;
}

// List available endpoints
app.get('/api', async (_req, res) => {
  const pluginsDir = join(__dirname, 'plugins');
  const availablePlugins: string[] = [];

  try {
    const files = readdirSync(pluginsDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    files.forEach(f => availablePlugins.push(f.replace(/\.(js|ts)$/, '')));
  } catch {
    // Plugins dir might not exist yet
  }

  res.json({
    server: 'Command Center Server Agent',
    version: '1.0.0',
    enabledPlugins: ENABLED_PLUGINS,
    availablePlugins,
    endpoints: ENABLED_PLUGINS.map(p => `/api/${p}`),
  });
});

// Start server
async function start() {
  console.log('🚀 Starting Command Center Server Agent...');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  const plugins = await loadPlugins();
  console.log(`📦 Loaded ${plugins.length} plugins`);

  app.listen(PORT, () => {
    console.log(`\n✨ Server Agent running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 API index: http://localhost:${PORT}/api`);
    if (!API_KEY) {
      console.log('\n⚠️  WARNING: Running without API_KEY authentication!');
    }
  });
}

start().catch(console.error);

