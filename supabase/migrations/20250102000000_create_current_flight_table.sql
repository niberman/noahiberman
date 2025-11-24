-- Create current_flight table for tracking active flights
CREATE TABLE IF NOT EXISTS public.current_flight (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tail_number text,
  flight_status text DEFAULT 'on_ground' CHECK (flight_status IN ('on_ground', 'in_flight')),
  destination text,
  departure_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_current_flight_user_id ON public.current_flight(user_id);

-- Enable RLS
ALTER TABLE public.current_flight ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own flight info
CREATE POLICY "Users can manage their own flight info" 
  ON public.current_flight 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Policy for public read access (for the tracking page)
CREATE POLICY "Public can view all current flights" 
  ON public.current_flight 
  FOR SELECT 
  USING (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_current_flight_updated_at
  BEFORE UPDATE ON public.current_flight
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
