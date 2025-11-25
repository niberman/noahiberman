import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import type { Plugin, CommandResult } from '../types.js';

const execAsync = promisify(exec);
const router = Router();

// Command history for audit trail
const commandHistory: CommandResult[] = [];
const MAX_HISTORY = 100;

// Get allowed commands from env (empty = allow all)
function getAllowedCommands(): string[] | null {
  const allowed = process.env.ALLOWED_COMMANDS;
  if (!allowed || allowed.trim() === '') {
    return null; // Allow all
  }
  return allowed.split(',').map(c => c.trim().toLowerCase());
}

// Check if command is allowed
function isCommandAllowed(command: string): boolean {
  const allowed = getAllowedCommands();
  if (allowed === null) return true;
  
  const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();
  return allowed.includes(baseCommand);
}

// Dangerous commands that should never be allowed
const BLOCKED_COMMANDS = [
  'rm -rf /',
  'mkfs',
  ':(){:|:&};:',
  'dd if=/dev/zero',
  '> /dev/sda',
  'chmod -R 777 /',
];

function isDangerous(command: string): boolean {
  const lowerCmd = command.toLowerCase();
  return BLOCKED_COMMANDS.some(blocked => lowerCmd.includes(blocked));
}

// Execute a command
router.post('/exec', async (req, res) => {
  const { command, timeout = 30000, cwd } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'command is required' });
  }

  // Security checks
  if (isDangerous(command)) {
    return res.status(403).json({ error: 'This command is blocked for safety reasons' });
  }

  if (!isCommandAllowed(command)) {
    const allowed = getAllowedCommands();
    return res.status(403).json({ 
      error: 'Command not in allowlist',
      allowedCommands: allowed,
    });
  }

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, {
      timeout: Math.min(timeout, 60000), // Max 60 seconds
      maxBuffer: 10 * 1024 * 1024, // 10MB
      cwd: cwd || process.env.HOME,
      shell: '/bin/bash',
    });

    const result: CommandResult = {
      command,
      stdout,
      stderr,
      exitCode: 0,
      timestamp: new Date().toISOString(),
    };

    // Add to history
    commandHistory.unshift(result);
    if (commandHistory.length > MAX_HISTORY) {
      commandHistory.pop();
    }

    res.json({
      ...result,
      duration: Date.now() - startTime,
    });
  } catch (error: any) {
    const result: CommandResult = {
      command,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
      timestamp: new Date().toISOString(),
    };

    commandHistory.unshift(result);
    if (commandHistory.length > MAX_HISTORY) {
      commandHistory.pop();
    }

    res.json(result);
  }
});

// Get command history
router.get('/history', (_req, res) => {
  res.json(commandHistory);
});

// Clear command history
router.delete('/history', (_req, res) => {
  commandHistory.length = 0;
  res.json({ success: true, message: 'Command history cleared' });
});

// Get environment info
router.get('/env', async (_req, res) => {
  try {
    const [user, pwd, shell, home] = await Promise.all([
      execAsync('whoami').then(r => r.stdout.trim()),
      execAsync('pwd').then(r => r.stdout.trim()),
      Promise.resolve(process.env.SHELL || '/bin/bash'),
      Promise.resolve(process.env.HOME || '/root'),
    ]);

    res.json({
      user,
      pwd,
      shell,
      home,
      path: process.env.PATH?.split(':').slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get environment info' });
  }
});

// Quick commands (pre-defined safe commands)
router.get('/quick/:action', async (req, res) => {
  const quickCommands: Record<string, string> = {
    'uptime': 'uptime',
    'whoami': 'whoami',
    'pwd': 'pwd',
    'df': 'df -h',
    'free': 'free -h',
    'top': 'top -bn1 | head -20',
    'ps': 'ps aux --sort=-%mem | head -15',
    'netstat': 'netstat -tuln 2>/dev/null || ss -tuln',
    'ip': 'ip addr show',
    'date': 'date',
    'hostname': 'hostname -f',
  };

  const action = req.params.action.toLowerCase();
  const command = quickCommands[action];

  if (!command) {
    return res.status(400).json({ 
      error: 'Unknown quick command',
      available: Object.keys(quickCommands),
    });
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    res.json({
      action,
      command,
      stdout,
      stderr,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.json({
      action,
      command,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    });
  }
});

const plugin: Plugin = {
  name: 'shell',
  description: 'Shell command execution',
  routes: router,
};

export default plugin;

