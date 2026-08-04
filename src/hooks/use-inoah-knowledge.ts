import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export interface KnowledgeEntry {
  id: string;
  content: string;
  collection: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface InoahSettings {
  system_prompt: string;
  match_threshold: number;
  match_count: number;
  updated_at?: string | null;
}

const ENTRIES_KEY = ["inoah", "entries"];
const SETTINGS_KEY = ["inoah", "settings"];

/** Reads and deletes go straight through RLS; only writes need the edge function. */
export function useKnowledgeEntries() {
  return useQuery({
    queryKey: ENTRIES_KEY,
    queryFn: async (): Promise<KnowledgeEntry[]> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase
        .from("memories")
        .select("id, content, collection, created_at, updated_at")
        .order("updated_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as KnowledgeEntry[];
    },
  });
}

/**
 * Saving goes through `inoah-embed` because the entry is useless without an
 * embedding, and generating one needs the Gemini key that only the edge
 * function holds.
 */
export function useSaveKnowledgeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { id?: string; content: string; collection: string }) => {
      if (!supabase || !supabaseUrl) throw new Error("Supabase is not configured.");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");

      const base = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || supabaseUrl;
      const response = await fetch(`${base}/functions/v1/inoah-embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(entry),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not save this entry.");
      }
      return data.entry as KnowledgeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useDeleteKnowledgeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.from("memories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useInoahSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<InoahSettings | null> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase
        .from("inoah_settings")
        .select("system_prompt, match_threshold, match_count, updated_at")
        .maybeSingle();

      if (error) throw error;
      return data as InoahSettings | null;
    },
  });
}

export function useSaveInoahSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: InoahSettings) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase
        .from("inoah_settings")
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq("id", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}
