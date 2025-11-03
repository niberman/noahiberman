import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Venture } from '@/data/ventures';

// Fetch all ventures
export function useVentures() {
  return useQuery({
    queryKey: ['ventures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventures')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      return data as Venture[];
    },
  });
}

// Fetch a single venture by ID
export function useVenture(id: string) {
  return useQuery({
    queryKey: ['ventures', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Venture;
    },
    enabled: !!id,
  });
}

// Create a new venture
export function useCreateVenture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venture: Omit<Venture, 'id'>) => {
      const { data, error } = await supabase
        .from('ventures')
        .insert(venture)
        .select()
        .single();

      if (error) throw error;
      return data as Venture;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventures'] });
    },
  });
}

// Update a venture
export function useUpdateVenture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Venture> & { id: string }) => {
      const { data, error } = await supabase
        .from('ventures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Venture;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ventures'] });
      queryClient.invalidateQueries({ queryKey: ['ventures', variables.id] });
    },
  });
}

// Delete a venture
export function useDeleteVenture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ventures')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventures'] });
    },
  });
}

