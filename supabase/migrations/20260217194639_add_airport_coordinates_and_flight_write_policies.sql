-- Create airport_coordinates table for map display
CREATE TABLE IF NOT EXISTS public.airport_coordinates (
  code TEXT PRIMARY KEY,
  name TEXT,
  longitude DOUBLE PRECISION NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.airport_coordinates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read airport coordinates"
  ON public.airport_coordinates FOR SELECT USING (true);

-- Authenticated users can manage airports
CREATE POLICY "Auth users can insert airports"
  ON public.airport_coordinates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can update airports"
  ON public.airport_coordinates FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can delete airports"
  ON public.airport_coordinates FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add write policies to existing flights table (currently only has public read)
CREATE POLICY "Auth users can insert flights"
  ON public.flights FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can update flights"
  ON public.flights FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can delete flights"
  ON public.flights FOR DELETE USING (auth.uid() IS NOT NULL);
