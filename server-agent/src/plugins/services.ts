import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Plugin, ServiceStatus } from '../types.js';

const execAsync = promisify(exec);
const router = Router();

// Check if systemctl is available
let systemctlAvailable = false;

async function init() {
  try {
    await execAsync('which systemctl');
    systemctlAvailable = true;
    console.log('  → systemctl available');
  } catch {
    console.warn('  → systemctl not available (not a systemd system)');
  }
}

const requireSystemctl = (_req: any, res: any, next: any) => {
  if (!systemctlAvailable) {
    return res.status(503).json({ error: 'systemctl is not available on this system' });
  }
  next();
};

// Parse systemctl status output
function parseServiceStatus(name: string, output: string): ServiceStatus {
  const activeMatch = output.match(/Active:\s+(\w+)/);
  const pidMatch = output.match(/Main PID:\s+(\d+)/);
  
  let status: ServiceStatus['status'] = 'unknown';
  if (activeMatch) {
    const activeState = activeMatch[1].toLowerCase();
    if (activeState === 'active') status = 'running';
    else if (activeState === 'inactive') status = 'stopped';
    else if (activeState === 'failed') status = 'failed';
  }

  return {
    name,
    status,
    pid: pidMatch ? parseInt(pidMatch[1]) : undefined,
  };
}

// List all services
router.get('/', requireSystemctl, async (_req, res) => {
  try {
    const { stdout } = await execAsync(
      'systemctl list-units --type=service --all --no-pager --plain',
      { timeout: 10000 }
    );

    const services = stdout
      .split('\n')
      .slice(1) // Skip header
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0]?.replace('.service', '') || '';
        const load = parts[1] || '';
        const active = parts[2] || '';
        const sub = parts[3] || '';
        
        let status: ServiceStatus['status'] = 'unknown';
        if (active === 'active' && sub === 'running') status = 'running';
        else if (active === 'inactive') status = 'stopped';
        else if (active === 'failed') status = 'failed';

        return { name, status, load, sub };
      })
      .filter(s => s.name && !s.name.includes('UNIT')); // Filter out headers

    res.json(services);
  } catch (error) {
    console.error('Services list error:', error);
    res.status(500).json({ error: 'Failed to list services' });
  }
});

// Get specific service status
router.get('/:name', requireSystemctl, async (req, res) => {
  try {
    const serviceName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    const { stdout } = await execAsync(
      `systemctl status ${serviceName}.service --no-pager`,
      { timeout: 5000 }
    ).catch(e => ({ stdout: e.stdout || '' })); // systemctl returns non-zero for stopped services

    const status = parseServiceStatus(serviceName, stdout);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

// Start service
router.post('/:name/start', requireSystemctl, async (req, res) => {
  try {
    const serviceName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    await execAsync(`sudo systemctl start ${serviceName}.service`, { timeout: 30000 });
    res.json({ success: true, message: `Service ${serviceName} started` });
  } catch (error) {
    res.status(500).json({ error: `Failed to start service: ${(error as Error).message}` });
  }
});

// Stop service
router.post('/:name/stop', requireSystemctl, async (req, res) => {
  try {
    const serviceName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    await execAsync(`sudo systemctl stop ${serviceName}.service`, { timeout: 30000 });
    res.json({ success: true, message: `Service ${serviceName} stopped` });
  } catch (error) {
    res.status(500).json({ error: `Failed to stop service: ${(error as Error).message}` });
  }
});

// Restart service
router.post('/:name/restart', requireSystemctl, async (req, res) => {
  try {
    const serviceName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    await execAsync(`sudo systemctl restart ${serviceName}.service`, { timeout: 30000 });
    res.json({ success: true, message: `Service ${serviceName} restarted` });
  } catch (error) {
    res.status(500).json({ error: `Failed to restart service: ${(error as Error).message}` });
  }
});

// Enable service (start on boot)
router.post('/:name/enable', requireSystemctl, async (req, res) => {
  try {
    const serviceName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    await execAsync(`sudo systemctl enable ${serviceName}.service`, { timeout: 10000 });
    res.json({ success: true, message: `Service ${serviceName} enabled` });
  } catch (error) {
    res.status(500).json({ error: `Failed to enable service: ${(error as Error).message}` });
  }
});

// Disable service
router.post('/:name/disable', requireSystemctl, async (req, res) => {
  try {
    const serviceName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    await execAsync(`sudo systemctl disable ${serviceName}.service`, { timeout: 10000 });
    res.json({ success: true, message: `Service ${serviceName} disabled` });
  } catch (error) {
    res.status(500).json({ error: `Failed to disable service: ${(error as Error).message}` });
  }
});

const plugin: Plugin = {
  name: 'services',
  description: 'Systemd service management',
  routes: router,
  init,
};

export default plugin;

