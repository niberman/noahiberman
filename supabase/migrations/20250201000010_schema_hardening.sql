-- Ensure user_id columns are NOT NULL for user-owned tables
ALTER TABLE public.agents
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.aircraft_status
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.crm_contacts
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.flight_tracking
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.uploads
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.generated_posts
  ALTER COLUMN user_id SET NOT NULL;

-- Normalize array defaults
ALTER TABLE public.ventures
  ALTER COLUMN tags TYPE text[] USING tags::text[],
  ALTER COLUMN tags SET DEFAULT '{}'::text[];

ALTER TABLE public.crm_contacts
  ALTER COLUMN tags SET DEFAULT '{}'::text[];

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop legacy updated_at triggers
DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
DROP TRIGGER IF EXISTS update_uploads_updated_at ON public.uploads;
DROP TRIGGER IF EXISTS update_generated_posts_updated_at ON public.generated_posts;
DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON public.crm_contacts;
DROP TRIGGER IF EXISTS update_flight_tracking_updated_at ON public.flight_tracking;

-- Attach unified updated_at triggers
CREATE TRIGGER set_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_generated_posts_updated_at
  BEFORE UPDATE ON public.generated_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_flight_tracking_updated_at
  BEFORE UPDATE ON public.flight_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_ventures_updated_at
  BEFORE UPDATE ON public.ventures
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_flights_updated_at
  BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- iNoah memory table
CREATE TABLE IF NOT EXISTS public.inoah_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bio','project','note','story','log','voice','other')),
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inoah_memory_embedding_idx
  ON public.inoah_memory
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- iNoah conversations table
CREATE TABLE IF NOT EXISTS public.inoah_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_session_idx
  ON public.inoah_conversations (session_id);

-- Scheduled posts table
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.generated_posts(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','missed','completed','failed')),
  last_attempt timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Agent logs table
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error','debug')),
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_id ON public.crm_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_posts_user_id ON public.generated_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);

-- RLS enablement
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inoah_memory ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can insert their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;

DROP POLICY IF EXISTS "Users can view their own aircraft status" ON public.aircraft_status;
DROP POLICY IF EXISTS "Users can insert their own aircraft status" ON public.aircraft_status;
DROP POLICY IF EXISTS "Users can update their own aircraft status" ON public.aircraft_status;
DROP POLICY IF EXISTS "Users can delete their own aircraft status" ON public.aircraft_status;

DROP POLICY IF EXISTS "Users can view their own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.crm_contacts;

DROP POLICY IF EXISTS "Users can view their own flight tracking" ON public.flight_tracking;
DROP POLICY IF EXISTS "Users can insert their own flight tracking" ON public.flight_tracking;
DROP POLICY IF EXISTS "Users can update their own flight tracking" ON public.flight_tracking;
DROP POLICY IF EXISTS "Users can delete their own flight tracking" ON public.flight_tracking;

DROP POLICY IF EXISTS "Users can view their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can insert their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON public.uploads;

DROP POLICY IF EXISTS "Users can view their own generated posts" ON public.generated_posts;
DROP POLICY IF EXISTS "Users can insert their own generated posts" ON public.generated_posts;
DROP POLICY IF EXISTS "Users can update their own generated posts" ON public.generated_posts;
DROP POLICY IF EXISTS "Users can delete their own generated posts" ON public.generated_posts;

-- Unified policies for user-owned tables
CREATE POLICY "User can manage own rows" ON public.agents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.aircraft_status
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.crm_contacts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.flight_tracking
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.uploads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.generated_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.scheduled_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can manage own rows" ON public.inoah_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure new tables leverage updated_at trigger where applicable
CREATE TRIGGER set_inoah_memory_updated_at
  BEFORE UPDATE ON public.inoah_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


