import { Router } from 'express';
import si from 'systeminformation';
import type { Plugin, SystemInfo } from '../types.js';

const router = Router();

// Get full system status
router.get('/', async (_req, res) => {
  try {
    const [cpu, cpuLoad, mem, disk, osInfo, time, load] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
      si.time(),
      si.fullLoad(),
    ]);

    // Try to get temperature (may not be available on all systems)
    let cpuTemp: number | undefined;
    try {
      const temp = await si.cpuTemperature();
      cpuTemp = temp.main || undefined;
    } catch {
      // Temperature not available
    }

    const primaryDisk = disk[0] || { size: 0, used: 0, available: 0 };

    const systemInfo: SystemInfo = {
      cpu: {
        usage: cpuLoad.currentLoad,
        cores: cpu.cores,
        model: `${cpu.manufacturer} ${cpu.brand}`,
        temperature: cpuTemp,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercent: (mem.used / mem.total) * 100,
      },
      disk: {
        total: primaryDisk.size,
        used: primaryDisk.used,
        free: primaryDisk.available,
        usagePercent: primaryDisk.use || 0,
      },
      uptime: time.uptime,
      hostname: osInfo.hostname,
      platform: `${osInfo.distro} ${osInfo.release}`,
      loadAvg: [load, 0, 0], // systeminformation gives overall load
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: 'Failed to get system information' });
  }
});

// Get CPU info specifically
router.get('/cpu', async (_req, res) => {
  try {
    const [cpu, load] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
    ]);

    res.json({
      model: `${cpu.manufacturer} ${cpu.brand}`,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
      usage: load.currentLoad,
      perCore: load.cpus.map(c => c.load),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get CPU info' });
  }
});

// Get memory info
router.get('/memory', async (_req, res) => {
  try {
    const mem = await si.mem();
    res.json({
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      usagePercent: (mem.used / mem.total) * 100,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get memory info' });
  }
});

// Get disk info
router.get('/disk', async (_req, res) => {
  try {
    const disks = await si.fsSize();
    res.json(disks.map(d => ({
      mount: d.mount,
      type: d.type,
      total: d.size,
      used: d.used,
      free: d.available,
      usagePercent: d.use,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get disk info' });
  }
});

// Get network info
router.get('/network', async (_req, res) => {
  try {
    const [interfaces, stats] = await Promise.all([
      si.networkInterfaces(),
      si.networkStats(),
    ]);

    res.json({
      interfaces: (Array.isArray(interfaces) ? interfaces : [interfaces]).map(i => ({
        name: i.iface,
        ip4: i.ip4,
        ip6: i.ip6,
        mac: i.mac,
        type: i.type,
      })),
      stats: stats.map(s => ({
        interface: s.iface,
        rxBytes: s.rx_bytes,
        txBytes: s.tx_bytes,
        rxSec: s.rx_sec,
        txSec: s.tx_sec,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get network info' });
  }
});

// Get process list
router.get('/processes', async (_req, res) => {
  try {
    const processes = await si.processes();
    res.json({
      all: processes.all,
      running: processes.running,
      blocked: processes.blocked,
      sleeping: processes.sleeping,
      list: processes.list.slice(0, 50).map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu,
        mem: p.mem,
        state: p.state,
        user: p.user,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get process list' });
  }
});

const plugin: Plugin = {
  name: 'system',
  description: 'System information and monitoring',
  routes: router,
};

export default plugin;

