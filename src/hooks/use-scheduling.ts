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
// Public booking: slots + booking (calls FastAPI backend)
// ---------------------------------------------------------------------------

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
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Booking failed");
      }
      return resp.json();
    },
  });
}
