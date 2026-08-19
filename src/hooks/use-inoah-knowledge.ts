import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export interface KnowledgeEntry {
  id: string;
  content: string;
  collection: string;
  visibility: "public" | "private" | "never";
  source_uri: string | null;
  ingested_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const ENTRIES_KEY = ["inoah", "entries"];

/** Reads and deletes go straight through RLS; only writes need the edge function. */
export function useKnowledgeEntries() {
  return useQuery({
    queryKey: ENTRIES_KEY,
    queryFn: async (): Promise<KnowledgeEntry[]> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase
        .from("memories")
        .select("id, content, collection, visibility, source_uri, ingested_at, created_at, updated_at")
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

/**
 * Promotion and demotion go straight through RLS: only the owner can update,
 * and the guard_visibility trigger makes 'never' terminal regardless of what
 * any client sends.
 */
export function useSetVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: "public" | "private" }) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase
        .from("memories")
        .update({ visibility })
        .eq("id", id);
      if (error) throw error;
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
