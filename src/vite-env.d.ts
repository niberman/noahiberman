/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Vite requires the VITE_ prefix for anything readable client-side. Every
  // value here ships inside the bundle, so none of them may be a secret that
  // grants more than the browser is already allowed to do.
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_FUNCTIONS_URL?: string;
  readonly VITE_INOAH_FUNCTION_PATH?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_ADSB_RAPIDAPI_KEY?: string;
  // Remote Visual Interface. The VITE_SERVER_AGENT_* spelling is what is set in
  // Vercel today; AgentsControl reads either.
  readonly VITE_AGENT_URL?: string;
  readonly VITE_AGENT_SECRET?: string;
  readonly VITE_SERVER_AGENT_URL?: string;
  readonly VITE_SERVER_AGENT_KEY?: string;
  // Also support Vercel integration variables (may not be accessible client-side)
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
