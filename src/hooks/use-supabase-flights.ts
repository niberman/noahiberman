import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Flight } from '@/data/flights';

// Fetch all flights
export function useFlights() {
  return useQuery({
    queryKey: ['flights'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Flight[];
    },
  });
}

// Fetch active flight
export function useActiveFlight() {
  return useQuery({
    queryKey: ['flights', 'active'],
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
      queryClient.invalidateQueries({ queryKey: ['flights'] });
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
      queryClient.invalidateQueries({ queryKey: ['flights'] });
    },
  });
}

