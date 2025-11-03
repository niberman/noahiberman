/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Vite requires VITE_ prefix for client-side env vars
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  // Also support Vercel integration variables (may not be accessible client-side)
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
