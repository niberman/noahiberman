-- Fix RLS policy for contact_messages table
-- Run this in your Supabase SQL Editor

-- First, ensure RLS is enabled (should already be enabled)
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow public select on contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Public insert contact messages" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_insert_policy" ON contact_messages;

-- Create the policy to allow anyone to insert contact messages
CREATE POLICY "Allow public insert on contact_messages" 
ON contact_messages
FOR INSERT 
WITH CHECK (true);

-- Create a policy to allow selecting the inserted row (needed for .select() after insert)
-- This allows reading any row - adjust if you want to restrict access
CREATE POLICY "Allow public select on contact_messages" 
ON contact_messages
FOR SELECT 
USING (true);

-- Verify the policies were created (this will show all policies on the table)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'contact_messages';

