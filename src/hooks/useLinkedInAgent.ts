import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Use server-agent for LinkedIn (browser automation runs there)
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

export interface LinkedInStatus {
  loggedIn: boolean;
  browserActive: boolean;
  queueLength: number;
  totalPublished: number;
}

export interface LinkedInPost {
  id: string;
  content: string;
  scheduledFor: string;
  status: 'pending' | 'processing' | 'published' | 'failed';
  error?: string;
  publishedAt?: string;
}

// Get LinkedIn connection status
export function useLinkedInStatus() {
  return useQuery({
    queryKey: ['linkedin', 'status'],
    queryFn: () => serverFetch<LinkedInStatus>('/api/linkedin/status'),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!SERVER_URL,
  });
}

// Login with credentials
export function useLinkedInLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return serverFetch<{ success: boolean; message: string; requiresVerification?: boolean }>(
        '/api/linkedin/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin', 'status'] });
    },
  });
}

// Logout
export function useLinkedInLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return serverFetch<{ success: boolean }>('/api/linkedin/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin', 'status'] });
    },
  });
}

// Post immediately
export function useLinkedInPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return serverFetch<{ success: boolean; postId: string; message: string }>(
        '/api/linkedin/post',
        { method: 'POST', body: JSON.stringify({ content }) }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['linkedin', 'history'] });
    },
  });
}

// Schedule a post
export function useLinkedInSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, scheduledFor }: { content: string; scheduledFor: string }) => {
      return serverFetch<{ success: boolean; post: LinkedInPost }>(
        '/api/linkedin/schedule',
        { method: 'POST', body: JSON.stringify({ content, scheduledFor }) }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin', 'queue'] });
    },
  });
}

// Get scheduled posts queue
export function useLinkedInQueue() {
  return useQuery({
    queryKey: ['linkedin', 'queue'],
    queryFn: () => serverFetch<LinkedInPost[]>('/api/linkedin/queue'),
    enabled: !!SERVER_URL,
  });
}

// Get post history
export function useLinkedInHistory() {
  return useQuery({
    queryKey: ['linkedin', 'history'],
    queryFn: () => serverFetch<LinkedInPost[]>('/api/linkedin/history'),
    enabled: !!SERVER_URL,
  });
}

// Cancel a scheduled post
export function useLinkedInCancelPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return serverFetch<{ success: boolean }>(`/api/linkedin/queue/${postId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin', 'queue'] });
    },
  });
}

// Check if LinkedIn is configured
export function isLinkedInConfigured(): boolean {
  return !!SERVER_URL;
}
