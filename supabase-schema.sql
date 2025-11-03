-- Supabase Database Schema
-- Run this in your Supabase SQL Editor to create the tables
-- Adjust types and constraints as needed for your use case

-- Ventures table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flights table
CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  route JSONB NOT NULL, -- { origin, originCode, destination, destinationCode }
  aircraft JSONB NOT NULL, -- { type, registration }
  duration TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'active', 'upcoming')),
  departure_time TEXT,
  arrival_time TEXT,
  altitude INTEGER,
  speed INTEGER,
  position JSONB, -- { latitude, longitude }
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ventures_status ON ventures(status);
CREATE INDEX IF NOT EXISTS idx_ventures_year ON ventures(year);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_year ON projects(year);
CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(date);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- Enable Row Level Security (RLS) - adjust policies based on your needs
ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (read-only for public, adjust as needed)
-- Drop policies if they exist, then create them (for idempotency)
DROP POLICY IF EXISTS "Allow public read access on ventures" ON ventures;
CREATE POLICY "Allow public read access on ventures" ON ventures
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on projects" ON projects;
CREATE POLICY "Allow public read access on projects" ON projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on flights" ON flights;
CREATE POLICY "Allow public read access on flights" ON flights
  FOR SELECT USING (true);

-- Contact messages: allow public to insert (submit messages) and select (needed for .select() after insert)
-- Drop policies if they exist, then create them (for idempotency)
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow public select on contact_messages" ON contact_messages;

-- Allow anyone to insert contact messages
CREATE POLICY "Allow public insert on contact_messages" ON contact_messages
  FOR INSERT 
  WITH CHECK (true);

-- Allow selecting the inserted row (needed when using .select() after insert)
-- Note: This allows reading any row. If you want to restrict this, you can remove this policy
-- and modify the code to not use .select() after insert
CREATE POLICY "Allow public select on contact_messages" ON contact_messages
  FOR SELECT 
  USING (true);

-- Note: If you need write access, create additional policies or disable RLS for development
-- For production, you should set up proper authentication and authorization

