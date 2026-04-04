import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

type AvailabilityProfile = Database["public"]["Tables"]["availability_profiles"]["Row"];
type AvailabilityProfileInsert = Database["public"]["Tables"]["availability_profiles"]["Insert"];
type MeetingType = Database["public"]["Tables"]["meeting_types"]["Row"];
type MeetingTypeInsert = Database["public"]["Tables"]["meeting_types"]["Insert"];

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Availability Profiles (admin)
// ---------------------------------------------------------------------------

export function useAvailabilityProfiles() {
  return useQuery({
    queryKey: ["availability-profiles"],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("availability_profiles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as AvailabilityProfile[];
    },
  });
}

export function useCreateAvailabilityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: AvailabilityProfileInsert) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("availability_profiles")
        .insert(profile)
        .select()
        .single();
      if (error) throw error;
      return data as AvailabilityProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-profiles"] }),
  });
}

export function useUpdateAvailabilityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string } & Partial<AvailabilityProfileInsert>) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("availability_profiles")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as AvailabilityProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-profiles"] }),
  });
}

export function useDeleteAvailabilityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase
        .from("availability_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-profiles"] }),
  });
}

// ---------------------------------------------------------------------------
// Meeting Types (admin)
// ---------------------------------------------------------------------------

export function useMeetingTypes() {
  return useQuery({
    queryKey: ["meeting-types"],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("meeting_types")
        .select("*, availability_profiles(name)")
        .order("name");
      if (error) throw error;
      return data as (MeetingType & { availability_profiles: { name: string } })[];
    },
  });
}

export function useCreateMeetingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mt: MeetingTypeInsert) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("meeting_types")
        .insert(mt)
        .select()
        .single();
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-types"] }),
  });
}

export function useUpdateMeetingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string } & Partial<MeetingTypeInsert>) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("meeting_types")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-types"] }),
  });
}

export function useDeleteMeetingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase
        .from("meeting_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-types"] }),
  });
}

// ---------------------------------------------------------------------------
// Scheduling auth + public booking (calls FastAPI backend)
// ---------------------------------------------------------------------------

export function getSchedulingApiBase() {
  return API_BASE;
}

export function schedulingApiNeedsPublicBase() {
  try {
    const apiUrl = new URL(API_BASE);
    const currentHost = window.location.hostname;
    const apiHost = apiUrl.hostname;
    const currentIsLocal =
      currentHost === "localhost" || currentHost === "127.0.0.1";
    const apiIsLocal = apiHost === "localhost" || apiHost === "127.0.0.1";

    return !currentIsLocal && apiIsLocal;
  } catch {
    return false;
  }
}

export interface SchedulingAuthStatus {
  connected: boolean;
}

export async function getSchedulingAuthUrl() {
  const resp = await fetch(`${API_BASE}/scheduling/auth/url`);
  if (!resp.ok) throw new Error("Failed to start Google Calendar connection");
  const data = await resp.json();
  return data.url as string;
}

export function useSchedulingAuthStatus() {
  return useQuery({
    queryKey: ["scheduling-auth-status"],
    queryFn: async () => {
      const resp = await fetch(`${API_BASE}/scheduling/auth/status`);
      if (!resp.ok) throw new Error("Failed to load Google Calendar status");
      return (await resp.json()) as SchedulingAuthStatus;
    },
  });
}

export function useExchangeSchedulingAuthCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const resp = await fetch(`${API_BASE}/scheduling/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Google Calendar connection failed");
      }
      return (await resp.json()) as { status: string; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling-auth-status"] });
    },
  });
}

export interface PublicMeetingTypeSummary {
  slug: string;
  name: string;
  duration_min: number;
  description: string | null;
  location_type: string;
}

export function usePublicMeetingTypes() {
  return useQuery({
    queryKey: ["scheduling-meeting-types-public"],
    queryFn: async () => {
      const resp = await fetch(`${API_BASE}/scheduling/meeting-types`);
      if (!resp.ok) throw new Error("Failed to load meeting types");
      const data = await resp.json();
      return data as { meeting_types: PublicMeetingTypeSummary[] };
    },
  });
}

export interface SlotData {
  start: string;
  end: string;
}

export interface MeetingInfo {
  name: string;
  duration_min: number;
  description: string | null;
  location_type: string;
}

export function useAvailableSlots(slug: string, startDate: string, days = 14) {
  return useQuery({
    queryKey: ["scheduling-slots", slug, startDate, days],
    queryFn: async () => {
      const resp = await fetch(
        `${API_BASE}/scheduling/slots/${slug}?start_date=${startDate}&days=${days}`
      );
      // #region agent log
      fetch("http://127.0.0.1:7784/ingest/66016851-02fb-4e62-b504-27870528b6d0", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "951172",
        },
        body: JSON.stringify({
          sessionId: "951172",
          location: "use-scheduling.ts:useAvailableSlots",
          message: "slots_fetch_response",
          data: {
            ok: resp.ok,
            status: resp.status,
            slug,
            apiBaseHost: (() => {
              try {
                return new URL(API_BASE).host;
              } catch {
                return "invalid_api_base";
              }
            })(),
          },
          timestamp: Date.now(),
          hypothesisId: "H4",
        }),
      }).catch(() => {});
      // #endregion
      if (!resp.ok) throw new Error("Failed to fetch slots");
      const data = await resp.json();
      return data as { slug: string; meeting: MeetingInfo; slots: SlotData[] };
    },
    enabled: !!slug && !!startDate,
  });
}

export function useBookSlot() {
  return useMutation({
    mutationFn: async ({
      slug,
      slot_start,
      guest_name,
      guest_email,
    }: {
      slug: string;
      slot_start: string;
      guest_name: string;
      guest_email: string;
    }) => {
      const resp = await fetch(`${API_BASE}/scheduling/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_start, guest_name, guest_email }),
      });
      // #region agent log
      fetch("http://127.0.0.1:7784/ingest/66016851-02fb-4e62-b504-27870528b6d0", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "951172",
        },
        body: JSON.stringify({
          sessionId: "951172",
          location: "use-scheduling.ts:useBookSlot",
          message: "book_fetch_response",
          data: { ok: resp.ok, status: resp.status, slug },
          timestamp: Date.now(),
          hypothesisId: "H4",
        }),
      }).catch(() => {});
      // #endregion
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Booking failed");
      }
      return resp.json();
    },
  });
}
