import { Router } from 'express';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Plugin } from '../types.js';

const execAsync = promisify(exec);
const router = Router();

// Default log paths to expose (can be overridden via env)
const DEFAULT_LOG_PATHS = [
  '/var/log/syslog',
  '/var/log/auth.log',
  '/var/log/kern.log',
  '/var/log/dmesg',
  '/var/log/messages',
];

function getAllowedLogPaths(): string[] {
  const envPaths = process.env.LOG_PATHS;
  if (envPaths) {
    return envPaths.split(',').map(p => p.trim());
  }
  return DEFAULT_LOG_PATHS;
}

// List available log files
router.get('/', async (_req, res) => {
  try {
    const allowedPaths = getAllowedLogPaths();
    const availableLogs: { path: string; size: number; modified: string }[] = [];

    for (const logPath of allowedPaths) {
      try {
        const stats = await stat(logPath);
        if (stats.isFile()) {
          availableLogs.push({
            path: logPath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        }
      } catch {
        // File doesn't exist or not accessible
      }
    }

    // Also check /var/log directory for common logs
    try {
      const varLogFiles = await readdir('/var/log');
      for (const file of varLogFiles.slice(0, 20)) {
        const fullPath = join('/var/log', file);
        try {
          const stats = await stat(fullPath);
          if (stats.isFile() && !availableLogs.find(l => l.path === fullPath)) {
            availableLogs.push({
              path: fullPath,
              size: stats.size,
              modified: stats.mtime.toISOString(),
            });
          }
        } catch {
          // Skip inaccessible files
        }
      }
    } catch {
      // /var/log not accessible
    }

    res.json(availableLogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list log files' });
  }
});

// Read a log file (tail)
router.get('/read', async (req, res) => {
  try {
    const logPath = req.query.path as string;
    const lines = parseInt(req.query.lines as string) || 100;

    if (!logPath) {
      return res.status(400).json({ error: 'path query parameter required' });
    }

    // Security: validate path
    const allowedPaths = getAllowedLogPaths();
    const isAllowed = allowedPaths.some(p => logPath.startsWith(p.replace(/\/[^/]+$/, '')));
    
    if (!isAllowed && !logPath.startsWith('/var/log/')) {
      return res.status(403).json({ error: 'Access to this log file is not allowed' });
    }

    // Use tail for efficiency
    const { stdout } = await execAsync(`tail -n ${lines} "${logPath}"`, {
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    res.json({
      path: logPath,
      lines: stdout.split('\n').filter(l => l),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to read log: ${(error as Error).message}` });
  }
});

// Search logs with grep
router.get('/search', async (req, res) => {
  try {
    const logPath = req.query.path as string;
    const pattern = req.query.pattern as string;
    const lines = parseInt(req.query.lines as string) || 50;

    if (!logPath || !pattern) {
      return res.status(400).json({ error: 'path and pattern query parameters required' });
    }

    // Security: validate path
    if (!logPath.startsWith('/var/log/')) {
      return res.status(403).json({ error: 'Access to this log file is not allowed' });
    }

    // Sanitize pattern for grep
    const safePattern = pattern.replace(/['"\\]/g, '');
    
    const { stdout } = await execAsync(
      `grep -i "${safePattern}" "${logPath}" | tail -n ${lines}`,
      { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
    ).catch(e => ({ stdout: '' })); // grep returns non-zero if no matches

    res.json({
      path: logPath,
      pattern,
      matches: stdout.split('\n').filter(l => l),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to search logs: ${(error as Error).message}` });
  }
});

// Get journalctl logs (systemd)
router.get('/journal', async (req, res) => {
  try {
    const unit = req.query.unit as string;
    const lines = parseInt(req.query.lines as string) || 100;
    const priority = req.query.priority as string; // emerg, alert, crit, err, warning, notice, info, debug

    let cmd = `journalctl --no-pager -n ${lines} --output=short-iso`;
    
    if (unit) {
      const safeUnit = unit.replace(/[^a-zA-Z0-9_.-]/g, '');
      cmd += ` -u ${safeUnit}`;
    }
    
    if (priority) {
      const safePriority = priority.replace(/[^a-zA-Z]/g, '');
      cmd += ` -p ${safePriority}`;
    }

    const { stdout } = await execAsync(cmd, {
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024,
    }).catch(e => ({ stdout: e.stdout || 'journalctl not available' }));

    res.json({
      unit: unit || 'all',
      lines: stdout.split('\n').filter(l => l),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get journal: ${(error as Error).message}` });
  }
});

// Get dmesg (kernel logs)
router.get('/dmesg', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines as string) || 100;
    
    const { stdout } = await execAsync(`dmesg --time-format=iso | tail -n ${lines}`, {
      timeout: 10000,
    }).catch(() => execAsync(`dmesg | tail -n ${lines}`));

    res.json({
      type: 'kernel',
      lines: stdout.split('\n').filter(l => l),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get kernel logs' });
  }
});

const plugin: Plugin = {
  name: 'logs',
  description: 'System log viewer',
  routes: router,
};

export default plugin;

