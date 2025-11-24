-- Ensure aircraft_status.last_updated stays in sync
CREATE OR REPLACE FUNCTION set_last_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_aircraft_status_last_updated ON aircraft_status;

CREATE TRIGGER update_aircraft_status_last_updated
  BEFORE UPDATE ON aircraft_status
  FOR EACH ROW
  EXECUTE FUNCTION set_last_updated_timestamp();


