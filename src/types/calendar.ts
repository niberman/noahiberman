// Calendar System Type Definitions
import { Json } from './supabase';

export interface CalendarProfile {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  timezone: string;
  description?: string;
  is_active: boolean;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface MeetingType {
  id: string;
  calendar_profile_id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  description?: string;
  location_type?: 'zoom' | 'phone' | 'in_person' | 'google_meet' | 'custom';
  location_details?: string;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  color?: string;
  is_active: boolean;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityProfile {
  id: string;
  calendar_profile_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  meeting_type_id: string;
  calendar_profile_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  cancellation_reason?: string;
  notes?: string;
  reminder_sent: boolean;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

// Extended types with joined data
export interface MeetingTypeWithProfile extends MeetingType {
  calendar_profile?: CalendarProfile;
}

export interface BookingWithDetails extends Booking {
  meeting_type?: MeetingType;
  calendar_profile?: CalendarProfile;
}

// Form types for creating/updating
export interface CreateCalendarProfileInput {
  name: string;
  slug: string;
  timezone: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCalendarProfileInput extends Partial<CreateCalendarProfileInput> {
  id: string;
}

export interface CreateMeetingTypeInput {
  calendar_profile_id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  description?: string;
  location_type?: 'zoom' | 'phone' | 'in_person' | 'google_meet' | 'custom';
  location_details?: string;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  color?: string;
  is_active?: boolean;
}

export interface UpdateMeetingTypeInput extends Partial<CreateMeetingTypeInput> {
  id: string;
}

export interface CreateAvailabilityInput {
  calendar_profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface UpdateAvailabilityInput extends Partial<CreateAvailabilityInput> {
  id: string;
}

export interface CreateBookingInput {
  meeting_type_id: string;
  calendar_profile_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  notes?: string;
}

export interface UpdateBookingInput {
  id: string;
  status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  cancellation_reason?: string;
  notes?: string;
}

// Utility types for calendar operations
export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface DayAvailability {
  date: Date;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  [key: number]: { // day_of_week as key
    start_time: string;
    end_time: string;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface CalendarAvailabilityResponse {
  calendar_profile: CalendarProfile;
  meeting_type: MeetingType;
  available_slots: TimeSlot[];
}
