-- Create flight_tracking table for FlightAware integration
CREATE TABLE IF NOT EXISTS flight_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fa_flight_id TEXT NOT NULL,
  flight_number TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  aircraft TEXT,
  status TEXT CHECK (status IN ('On Time', 'Delayed', 'Departed', 'Arrived', 'Cancelled')) DEFAULT 'On Time',
  tracking_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_flight_tracking_user_id ON flight_tracking(user_id);
CREATE INDEX idx_flight_tracking_fa_flight_id ON flight_tracking(fa_flight_id);
CREATE INDEX idx_flight_tracking_flight_number ON flight_tracking(flight_number);
CREATE INDEX idx_flight_tracking_status ON flight_tracking(status);
CREATE INDEX idx_flight_tracking_departure_time ON flight_tracking(departure_time DESC);
CREATE INDEX idx_flight_tracking_created_at ON flight_tracking(created_at DESC);

-- Enable Row Level Security
ALTER TABLE flight_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own flight tracking"
  ON flight_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flight tracking"
  ON flight_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flight tracking"
  ON flight_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flight tracking"
  ON flight_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_flight_tracking_updated_at
  BEFORE UPDATE ON flight_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

