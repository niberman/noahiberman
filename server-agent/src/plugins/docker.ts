import { Router } from 'express';
import Docker from 'dockerode';
import type { Plugin, DockerContainer } from '../types.js';

const router = Router();
let docker: Docker | null = null;

// Initialize Docker connection
async function init() {
  try {
    docker = new Docker();
    await docker.ping();
    console.log('  → Docker connection established');
  } catch (error) {
    console.warn('  → Docker not available:', (error as Error).message);
    docker = null;
  }
}

// Check Docker availability middleware
const requireDocker = (_req: any, res: any, next: any) => {
  if (!docker) {
    return res.status(503).json({ error: 'Docker is not available on this system' });
  }
  next();
};

// List all containers
router.get('/containers', requireDocker, async (_req, res) => {
  try {
    const containers = await docker!.listContainers({ all: true });
    
    const result: DockerContainer[] = containers.map(c => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace(/^\//, '') || 'unnamed',
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports.map(p => p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`),
      created: c.Created,
    }));

    res.json(result);
  } catch (error) {
    console.error('Docker containers error:', error);
    res.status(500).json({ error: 'Failed to list containers' });
  }
});

// Get container details
router.get('/containers/:id', requireDocker, async (req, res) => {
  try {
    const container = docker!.getContainer(req.params.id);
    const info = await container.inspect();

    res.json({
      id: info.Id.substring(0, 12),
      name: info.Name.replace(/^\//, ''),
      image: info.Config.Image,
      state: info.State,
      created: info.Created,
      config: {
        env: info.Config.Env,
        cmd: info.Config.Cmd,
        workingDir: info.Config.WorkingDir,
      },
      network: info.NetworkSettings,
      mounts: info.Mounts,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get container details' });
  }
});

// Start container
router.post('/containers/:id/start', requireDocker, async (req, res) => {
  try {
    const container = docker!.getContainer(req.params.id);
    await container.start();
    res.json({ success: true, message: `Container ${req.params.id} started` });
  } catch (error) {
    res.status(500).json({ error: `Failed to start container: ${(error as Error).message}` });
  }
});

// Stop container
router.post('/containers/:id/stop', requireDocker, async (req, res) => {
  try {
    const container = docker!.getContainer(req.params.id);
    await container.stop();
    res.json({ success: true, message: `Container ${req.params.id} stopped` });
  } catch (error) {
    res.status(500).json({ error: `Failed to stop container: ${(error as Error).message}` });
  }
});

// Restart container
router.post('/containers/:id/restart', requireDocker, async (req, res) => {
  try {
    const container = docker!.getContainer(req.params.id);
    await container.restart();
    res.json({ success: true, message: `Container ${req.params.id} restarted` });
  } catch (error) {
    res.status(500).json({ error: `Failed to restart container: ${(error as Error).message}` });
  }
});

// Get container logs
router.get('/containers/:id/logs', requireDocker, async (req, res) => {
  try {
    const container = docker!.getContainer(req.params.id);
    const tail = parseInt(req.query.tail as string) || 100;
    
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });

    // Docker logs come as a buffer with header bytes, clean them up
    const logString = logs.toString('utf-8')
      .split('\n')
      .map(line => line.substring(8)) // Remove docker stream header
      .filter(line => line.trim())
      .join('\n');

    res.json({ containerId: req.params.id, logs: logString });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get container logs' });
  }
});

// List images
router.get('/images', requireDocker, async (_req, res) => {
  try {
    const images = await docker!.listImages();
    
    res.json(images.map(img => ({
      id: img.Id.substring(7, 19),
      tags: img.RepoTags || ['<none>'],
      size: img.Size,
      created: img.Created,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// Docker system info
router.get('/info', requireDocker, async (_req, res) => {
  try {
    const info = await docker!.info();
    
    res.json({
      containers: info.Containers,
      containersRunning: info.ContainersRunning,
      containersPaused: info.ContainersPaused,
      containersStopped: info.ContainersStopped,
      images: info.Images,
      serverVersion: info.ServerVersion,
      memoryLimit: info.MemoryLimit,
      cpus: info.NCPU,
      operatingSystem: info.OperatingSystem,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Docker info' });
  }
});

const plugin: Plugin = {
  name: 'docker',
  description: 'Docker container management',
  routes: router,
  init,
};

export default plugin;

