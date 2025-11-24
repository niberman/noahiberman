-- Create Ventures table
CREATE TABLE IF NOT EXISTS ventures (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  role TEXT NOT NULL,
  year TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'in-progress')),
  link TEXT,
  tags TEXT[] DEFAULT '{}',
  subtitle_en TEXT,
  subtitle_es TEXT,
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  year TEXT NOT NULL,
  technologies TEXT[] DEFAULT '{}',
  link TEXT,
  image TEXT,
  venture_link TEXT,
  venture_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Flights table
CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  route JSONB NOT NULL,
  aircraft JSONB NOT NULL,
  duration TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'active', 'upcoming')),
  departure_time TEXT,
  arrival_time TEXT,
  altitude INTEGER,
  speed INTEGER,
  position JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ventures_status ON ventures(status);
CREATE INDEX IF NOT EXISTS idx_ventures_year ON ventures(year);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_year ON projects(year);
CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(date);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- Enable RLS
ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read access policies
DROP POLICY IF EXISTS "Allow public read access on ventures" ON ventures;
CREATE POLICY "Allow public read access on ventures" ON ventures
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on projects" ON projects;
CREATE POLICY "Allow public read access on projects" ON projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on flights" ON flights;
CREATE POLICY "Allow public read access on flights" ON flights
  FOR SELECT USING (true);

-- Contact form policies: allow inserts + select for returning rows
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON contact_messages;
CREATE POLICY "Allow public insert on contact_messages" ON contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on contact_messages" ON contact_messages;
CREATE POLICY "Allow public select on contact_messages" ON contact_messages
  FOR SELECT USING (true);


