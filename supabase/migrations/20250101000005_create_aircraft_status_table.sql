-- Create aircraft_status table for aviation tracking
CREATE TABLE IF NOT EXISTS aircraft_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_tail_number TEXT NOT NULL,
  aircraft_type TEXT NOT NULL,
  airport_base TEXT,
  status TEXT NOT NULL CHECK (status IN ('On Ground', 'En Route', 'Training', 'Maintenance')) DEFAULT 'On Ground',
  location TEXT,
  metadata JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_aircraft_status_user_id ON aircraft_status(user_id);
CREATE INDEX idx_aircraft_status_tail_number ON aircraft_status(aircraft_tail_number);
CREATE INDEX idx_aircraft_status_status ON aircraft_status(status);
CREATE INDEX idx_aircraft_status_last_updated ON aircraft_status(last_updated DESC);

-- Enable Row Level Security
ALTER TABLE aircraft_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own aircraft status"
  ON aircraft_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own aircraft status"
  ON aircraft_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aircraft status"
  ON aircraft_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aircraft status"
  ON aircraft_status FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update last_updated
CREATE TRIGGER update_aircraft_status_last_updated
  BEFORE UPDATE ON aircraft_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

