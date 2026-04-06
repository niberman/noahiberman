-- Calendar Profile Creation System Migration
-- Creates tables for calendar profiles, meeting types, availability, and bookings

-- 1. Calendar Profiles Table
CREATE TABLE IF NOT EXISTS public.calendar_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Denver',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT calendar_profiles_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- 2. Meeting Types Table
CREATE TABLE IF NOT EXISTS public.meeting_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_profile_id UUID REFERENCES public.calendar_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    description TEXT,
    location_type TEXT CHECK (location_type IN ('zoom', 'phone', 'in_person', 'google_meet', 'custom')),
    location_details TEXT,
    buffer_before_minutes INTEGER DEFAULT 0 CHECK (buffer_before_minutes >= 0),
    buffer_after_minutes INTEGER DEFAULT 0 CHECK (buffer_after_minutes >= 0),
    color TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT meeting_types_unique_slug_per_profile UNIQUE (calendar_profile_id, slug)
);

-- 3. Availability Profiles Table (Weekly recurring availability)
CREATE TABLE IF NOT EXISTS public.availability_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_profile_id UUID REFERENCES public.calendar_profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT availability_end_after_start CHECK (end_time > start_time)
);

-- 4. Bookings/Appointments Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_type_id UUID REFERENCES public.meeting_types(id) ON DELETE CASCADE NOT NULL,
    calendar_profile_id UUID REFERENCES public.calendar_profiles(id) ON DELETE CASCADE NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Denver',
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    cancellation_reason TEXT,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT bookings_end_after_start CHECK (scheduled_end > scheduled_start)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_profiles_user_id ON public.calendar_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_profiles_slug ON public.calendar_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_calendar_profiles_is_active ON public.calendar_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_meeting_types_calendar_profile_id ON public.meeting_types(calendar_profile_id);
CREATE INDEX IF NOT EXISTS idx_meeting_types_is_active ON public.meeting_types(is_active);

CREATE INDEX IF NOT EXISTS idx_availability_calendar_profile_id ON public.availability_profiles(calendar_profile_id);
CREATE INDEX IF NOT EXISTS idx_availability_day_of_week ON public.availability_profiles(day_of_week);

CREATE INDEX IF NOT EXISTS idx_bookings_calendar_profile_id ON public.bookings(calendar_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_type_id ON public.bookings(meeting_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_start ON public.bookings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON public.bookings(guest_email);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_calendar_profiles_updated_at
    BEFORE UPDATE ON public.calendar_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_types_updated_at
    BEFORE UPDATE ON public.meeting_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_profiles_updated_at
    BEFORE UPDATE ON public.availability_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.calendar_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Calendar Profiles Policies
CREATE POLICY "Users can view their own calendar profiles"
    ON public.calendar_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar profiles"
    ON public.calendar_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar profiles"
    ON public.calendar_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar profiles"
    ON public.calendar_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Public can view active calendar profiles (for booking)
CREATE POLICY "Anyone can view active calendar profiles"
    ON public.calendar_profiles FOR SELECT
    USING (is_active = true);

-- Meeting Types Policies
CREATE POLICY "Users can manage meeting types for their calendar profiles"
    ON public.meeting_types FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = meeting_types.calendar_profile_id
            AND user_id = auth.uid()
        )
    );

-- Public can view active meeting types
CREATE POLICY "Anyone can view active meeting types"
    ON public.meeting_types FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = meeting_types.calendar_profile_id
            AND is_active = true
        )
    );

-- Availability Profiles Policies
CREATE POLICY "Users can manage availability for their calendar profiles"
    ON public.availability_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = availability_profiles.calendar_profile_id
            AND user_id = auth.uid()
        )
    );

-- Public can view active availability
CREATE POLICY "Anyone can view availability for active profiles"
    ON public.availability_profiles FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = availability_profiles.calendar_profile_id
            AND is_active = true
        )
    );

-- Bookings Policies
CREATE POLICY "Users can view bookings for their calendar profiles"
    ON public.bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = bookings.calendar_profile_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update bookings for their calendar profiles"
    ON public.bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = bookings.calendar_profile_id
            AND user_id = auth.uid()
        )
    );

-- Anyone can create bookings (for public booking)
CREATE POLICY "Anyone can create bookings for active profiles"
    ON public.bookings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.calendar_profiles
            WHERE id = bookings.calendar_profile_id
            AND is_active = true
        )
    );

-- Guests can view their own bookings by email
CREATE POLICY "Guests can view their own bookings"
    ON public.bookings FOR SELECT
    USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Add comments for documentation
COMMENT ON TABLE public.calendar_profiles IS 'Stores calendar profile configurations for users';
COMMENT ON TABLE public.meeting_types IS 'Defines different types of meetings available for booking';
COMMENT ON TABLE public.availability_profiles IS 'Stores weekly recurring availability windows';
COMMENT ON TABLE public.bookings IS 'Stores scheduled appointments and meetings';

COMMENT ON COLUMN public.calendar_profiles.slug IS 'URL-friendly identifier for the calendar profile';
COMMENT ON COLUMN public.meeting_types.duration_minutes IS 'Length of the meeting in minutes (max 8 hours)';
COMMENT ON COLUMN public.availability_profiles.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN public.bookings.status IS 'Booking status: confirmed, cancelled, completed, or no_show';
