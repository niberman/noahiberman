import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Flight } from '@/data/flights';
import { flightHistory as staticFlightHistory } from '@/data/flights';

const QUERY_KEY = ['flights'];

// Fetch all flights from Supabase, falling back to static data
export function useFlights() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!supabase) {
        return staticFlightHistory;
      }
      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      // Fall back to static data if Supabase returns empty
      if (!data || data.length === 0) return staticFlightHistory;
      return data as Flight[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Fetch active flight
export function useActiveFlight() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'active'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data as Flight | null;
    },
  });
}

// Create a new flight
export function useCreateFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flight: Omit<Flight, 'id'>) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('flights')
        .insert(flight)
        .select()
        .single();

      if (error) throw error;
      return data as Flight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// Update a flight
export function useUpdateFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Flight> & { id: string }) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('flights')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Flight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// Bulk create flights (for CSV import)
export function useBulkCreateFlights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flights: Omit<Flight, 'id'>[]) => {
      if (!supabase) throw new Error('Supabase is not configured');
      if (flights.length === 0) return [];

      // Generate IDs for each flight
      const withIds = flights.map((f, idx) => ({
        ...f,
        id: `flight-${f.date}-${idx}-${Date.now()}`,
      }));

      // Batch in chunks of 50 to avoid payload limits
      const results: Flight[] = [];
      for (let i = 0; i < withIds.length; i += 50) {
        const chunk = withIds.slice(i, i + 50);
        const { data, error } = await supabase
          .from('flights')
          .insert(chunk)
          .select();

        if (error) throw error;
        if (data) results.push(...(data as Flight[]));
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// Delete a flight
export function useDeleteFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { error } = await supabase
        .from('flights')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

