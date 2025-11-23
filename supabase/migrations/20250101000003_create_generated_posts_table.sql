-- Create generated_posts table for AI-generated content
CREATE TABLE IF NOT EXISTS generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'other')) DEFAULT 'linkedin',
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')) DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_generated_posts_user_id ON generated_posts(user_id);
CREATE INDEX idx_generated_posts_upload_id ON generated_posts(upload_id);
CREATE INDEX idx_generated_posts_status ON generated_posts(status);
CREATE INDEX idx_generated_posts_platform ON generated_posts(platform);
CREATE INDEX idx_generated_posts_created_at ON generated_posts(created_at DESC);
CREATE INDEX idx_generated_posts_scheduled_at ON generated_posts(scheduled_at);

-- Enable Row Level Security
ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own generated posts"
  ON generated_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated posts"
  ON generated_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated posts"
  ON generated_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated posts"
  ON generated_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_generated_posts_updated_at
  BEFORE UPDATE ON generated_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

