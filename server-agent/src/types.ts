import type { Router } from 'express';

export interface Plugin {
  name: string;
  description: string;
  routes: Router;
  init?: () => Promise<void>;
}

export interface PluginModule {
  default: Plugin;
}

export interface SystemInfo {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: number;
  hostname: string;
  platform: string;
  loadAvg: number[];
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string[];
  created: number;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  pid?: number;
  uptime?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  timestamp: string;
}

export interface LogEntry {
  file: string;
  lines: string[];
  timestamp: string;
}

