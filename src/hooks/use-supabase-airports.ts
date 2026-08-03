import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { airportCoordinates as staticAirportCoordinates } from '@/lib/airport-coordinates';

export interface AirportCoordinate {
  code: string;
  name: string | null;
  longitude: number;
  latitude: number;
  created_at?: string;
}

const QUERY_KEY = ['airports'];

export function useAirportCoordinates() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { data, error } = await supabase
        .from('airport_coordinates')
        .select('*')
        .order('code');

      if (error) throw error;
      return data as AirportCoordinate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Build a lookup map from the airport coordinates data.
 * Returns Record<code, [longitude, latitude]> matching the old static format.
 * Falls back to static airport coordinates if Supabase data isn't available.
 *
 * Memoized: consumers use this map as an effect dependency, and a fresh object
 * every render made those effects tear down and rebuild map sources/layers on
 * every unrelated state change.
 */
export function useAirportLookupMap() {
  const { data: airports, ...rest } = useAirportCoordinates();

  const lookupMap = useMemo(() => {
    // Start with static data as base, overlay Supabase data on top
    const map: Record<string, [number, number]> = { ...staticAirportCoordinates };
    for (const ap of airports ?? []) {
      map[ap.code] = [ap.longitude, ap.latitude];
    }
    return map;
  }, [airports]);

  return { lookupMap, airports, ...rest };
}

export function useCreateAirport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (airport: Omit<AirportCoordinate, 'created_at'>) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { data, error } = await supabase
        .from('airport_coordinates')
        .upsert(airport, { onConflict: 'code' })
        .select()
        .single();

      if (error) throw error;
      return data as AirportCoordinate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useBulkCreateAirports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (airports: Omit<AirportCoordinate, 'created_at'>[]) => {
      if (!supabase) throw new Error('Supabase is not configured');
      if (airports.length === 0) return [];

      const { data, error } = await supabase
        .from('airport_coordinates')
        .upsert(airports, { onConflict: 'code' })
        .select();

      if (error) throw error;
      return (data ?? []) as AirportCoordinate[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteAirport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { error } = await supabase
        .from('airport_coordinates')
        .delete()
        .eq('code', code);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
