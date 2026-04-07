import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { callSupabaseFunction } from '@/lib/supabaseFunctions';
import type {
  Agent,
  AircraftStatus,
  TrackFlightRequest,
  TrackFlightResponse,
} from '@/types/dashboard';

const supabaseReady = isSupabaseConfigured() && !!supabase;

const ensureSupabaseClient = () => {
  if (!supabaseReady || !supabase) {
    throw new Error('Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return supabase;
};

export function useAgents() {
  return useQuery({
    queryKey: ['dashboard', 'agents'],
    enabled: supabaseReady,
    queryFn: async () => {
      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('agents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Agent[];
    },
  });
}

export function useAircraftStatus() {
  return useQuery({
    queryKey: ['dashboard', 'aircraft-status'],
    enabled: supabaseReady,
    queryFn: async () => {
      const data = await callSupabaseFunction<{ success: boolean; aircraft?: AircraftStatus | null }>('aircraft-status', {
        method: 'GET',
      });

      if (!data.success) {
        throw new Error('Unable to fetch aircraft status');
      }

      return data.aircraft ?? null;
    },
  });
}

export function useUpsertAircraftStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: Partial<AircraftStatus>) => {
      const data = await callSupabaseFunction<{ success: boolean; aircraft: AircraftStatus }>('aircraft-status', {
        method: 'POST',
        body: status,
      });

      if (!data.success) {
        throw new Error('Unable to save aircraft status');
      }

      return data.aircraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'aircraft-status'] });
    },
  });
}

export function useTrackFlight() {
  return useMutation({
    mutationFn: async (payload: TrackFlightRequest) => {
      const data = await callSupabaseFunction<TrackFlightResponse, TrackFlightRequest>('track-flight', {
        method: 'POST',
        body: payload,
      });

      if (!data.success) {
        throw new Error('Unable to track this flight right now.');
      }

      return data;
    },
  });
}


