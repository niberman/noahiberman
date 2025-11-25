import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ServerSystemInfo,
  DockerContainer,
  ServiceStatus,
  CommandResult,
  LogEntry,
} from '@/types/dashboard';

// Server URL from environment
const SERVER_URL = import.meta.env.VITE_SERVER_AGENT_URL || '';
const API_KEY = import.meta.env.VITE_SERVER_AGENT_KEY || '';

const serverFetch = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  if (!SERVER_URL) {
    throw new Error('Server agent URL not configured');
  }

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Health check
export function useServerHealth() {
  return useQuery({
    queryKey: ['server', 'health'],
    queryFn: () => serverFetch<{ status: string; timestamp: string }>('/health'),
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
    enabled: !!SERVER_URL,
  });
}

// System info
export function useServerSystem() {
  return useQuery({
    queryKey: ['server', 'system'],
    queryFn: () => serverFetch<ServerSystemInfo>('/api/system'),
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!SERVER_URL,
  });
}

// Docker containers
export function useDockerContainers() {
  return useQuery({
    queryKey: ['server', 'docker', 'containers'],
    queryFn: () => serverFetch<DockerContainer[]>('/api/docker/containers'),
    refetchInterval: 10000,
    enabled: !!SERVER_URL,
  });
}

// Docker container actions
export function useDockerAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ containerId, action }: { containerId: string; action: 'start' | 'stop' | 'restart' }) => {
      return serverFetch<{ success: boolean; message: string }>(
        `/api/docker/containers/${containerId}/${action}`,
        { method: 'POST' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', 'docker'] });
    },
  });
}

// Docker container logs
export function useContainerLogs(containerId: string, tail = 100) {
  return useQuery({
    queryKey: ['server', 'docker', 'logs', containerId],
    queryFn: () => serverFetch<{ containerId: string; logs: string }>(
      `/api/docker/containers/${containerId}/logs?tail=${tail}`
    ),
    enabled: !!SERVER_URL && !!containerId,
  });
}

// Services list
export function useServices() {
  return useQuery({
    queryKey: ['server', 'services'],
    queryFn: () => serverFetch<ServiceStatus[]>('/api/services'),
    refetchInterval: 15000,
    enabled: !!SERVER_URL,
  });
}

// Service actions
export function useServiceAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceName, action }: { serviceName: string; action: 'start' | 'stop' | 'restart' }) => {
      return serverFetch<{ success: boolean; message: string }>(
        `/api/services/${serviceName}/${action}`,
        { method: 'POST' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', 'services'] });
    },
  });
}

// Log files list
export function useLogFiles() {
  return useQuery({
    queryKey: ['server', 'logs', 'list'],
    queryFn: () => serverFetch<{ path: string; size: number; modified: string }[]>('/api/logs'),
    enabled: !!SERVER_URL,
  });
}

// Read log file
export function useLogFile(path: string, lines = 100) {
  return useQuery({
    queryKey: ['server', 'logs', 'read', path],
    queryFn: () => serverFetch<LogEntry>(`/api/logs/read?path=${encodeURIComponent(path)}&lines=${lines}`),
    enabled: !!SERVER_URL && !!path,
    refetchInterval: 5000,
  });
}

// Journal logs
export function useJournalLogs(unit?: string, lines = 100) {
  return useQuery({
    queryKey: ['server', 'logs', 'journal', unit],
    queryFn: () => serverFetch<LogEntry>(
      `/api/logs/journal?${unit ? `unit=${unit}&` : ''}lines=${lines}`
    ),
    enabled: !!SERVER_URL,
    refetchInterval: 5000,
  });
}

// Shell command execution
export function useShellExec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ command, timeout }: { command: string; timeout?: number }) => {
      return serverFetch<CommandResult>('/api/shell/exec', {
        method: 'POST',
        body: JSON.stringify({ command, timeout }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', 'shell', 'history'] });
    },
  });
}

// Command history
export function useCommandHistory() {
  return useQuery({
    queryKey: ['server', 'shell', 'history'],
    queryFn: () => serverFetch<CommandResult[]>('/api/shell/history'),
    enabled: !!SERVER_URL,
  });
}

// Quick commands
export function useQuickCommand() {
  return useMutation({
    mutationFn: async (action: string) => {
      return serverFetch<CommandResult>(`/api/shell/quick/${action}`);
    },
  });
}

// Check if server is configured
export function isServerConfigured(): boolean {
  return !!SERVER_URL;
}

