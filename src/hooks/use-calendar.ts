import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  CalendarProfile,
  MeetingType,
  AvailabilityProfile,
  Booking,
  CreateCalendarProfileInput,
  UpdateCalendarProfileInput,
  CreateMeetingTypeInput,
  UpdateMeetingTypeInput,
  CreateAvailabilityInput,
  CreateBookingInput,
  UpdateBookingInput,
  BookingWithDetails,
} from '../types/calendar';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Helper to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
};

// Calendar Profiles Hooks
export function useCalendarProfiles() {
  return useQuery({
    queryKey: ['calendar-profiles'],
    queryFn: async (): Promise<CalendarProfile[]> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-profiles`, {
        headers,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch calendar profiles');
      }
      return response.json();
    },
  });
}

export function useCalendarProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['calendar-profiles', id],
    queryFn: async (): Promise<CalendarProfile> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-profiles/${id}`, {
        headers,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch calendar profile');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateCalendarProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCalendarProfileInput): Promise<CalendarProfile> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-profiles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create calendar profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-profiles'] });
    },
  });
}

export function useUpdateCalendarProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCalendarProfileInput): Promise<CalendarProfile> => {
      const { id, ...updates } = input;
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-profiles/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update calendar profile');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-profiles', variables.id] });
    },
  });
}

export function useDeleteCalendarProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-profiles/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete calendar profile');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-profiles'] });
    },
  });
}

// Meeting Types Hooks
export function useMeetingTypes(calendarProfileId?: string) {
  return useQuery({
    queryKey: ['meeting-types', calendarProfileId],
    queryFn: async (): Promise<MeetingType[]> => {
      const headers = await getAuthHeaders();
      const url = calendarProfileId
        ? `${SUPABASE_URL}/functions/v1/meeting-types?calendar_profile_id=${calendarProfileId}`
        : `${SUPABASE_URL}/functions/v1/meeting-types`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch meeting types');
      }
      return response.json();
    },
    enabled: calendarProfileId !== undefined,
  });
}

export function useCreateMeetingType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMeetingTypeInput): Promise<MeetingType> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/meeting-types`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create meeting type');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-types', data.calendar_profile_id] });
    },
  });
}

export function useUpdateMeetingType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMeetingTypeInput): Promise<MeetingType> => {
      const { id, ...updates } = input;
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/meeting-types/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update meeting type');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-types', data.calendar_profile_id] });
    },
  });
}

export function useDeleteMeetingType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/meeting-types/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete meeting type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
    },
  });
}

// Availability Hooks
export function useAvailability(calendarProfileId?: string) {
  return useQuery({
    queryKey: ['availability', calendarProfileId],
    queryFn: async (): Promise<AvailabilityProfile[]> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/availability?calendar_profile_id=${calendarProfileId}`,
        { headers }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch availability');
      }
      return response.json();
    },
    enabled: !!calendarProfileId,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ calendarProfileId, slots }: { calendarProfileId: string; slots: CreateAvailabilityInput[] }): Promise<AvailabilityProfile[]> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/availability?calendar_profile_id=${calendarProfileId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(slots),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.calendarProfileId] });
    },
  });
}

// Bookings Hooks
export function useBookings(calendarProfileId?: string, status?: string) {
  return useQuery({
    queryKey: ['bookings', calendarProfileId, status],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const headers = await getAuthHeaders();
      let url = `${SUPABASE_URL}/functions/v1/bookings`;
      const params = new URLSearchParams();
      if (calendarProfileId) params.append('calendar_profile_id', calendarProfileId);
      if (status) params.append('status', status);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch bookings');
      }
      return response.json();
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput): Promise<BookingWithDetails> => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', data.calendar_profile_id] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBookingInput): Promise<BookingWithDetails> => {
      const { id, ...updates } = input;
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bookings/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update booking');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', data.calendar_profile_id] });
    },
  });
}
