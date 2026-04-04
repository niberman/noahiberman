#!/usr/bin/env bash
# Print Vite-friendly env lines from the Supabase CLI.
#
# - VITE_SUPABASE_* comes from `supabase status` when the local stack is running.
# - VITE_API_BASE is your FastAPI scheduling backend (not Supabase); default local port 8000.
#
# Usage (from repo root):
#   npm run env:from-supabase
#   # or
#   bash scripts/print-frontend-env-from-supabase.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "# --- Scheduling API (FastAPI). Not provided by Supabase. ---"
echo "VITE_API_BASE=http://localhost:8000"
echo ""

if supabase status >/dev/null 2>&1; then
  echo "# --- Local Supabase (from: supabase status -o env) ---"
  # Override keys match Supabase CLI internal names (see cli internal/status/status.go).
  supabase status -o env \
    --override-name api.url=VITE_SUPABASE_URL \
    --override-name auth.anon_key=VITE_SUPABASE_ANON_KEY \
    --override-name api.functions_url=VITE_SUPABASE_FUNCTIONS_URL
else
  echo "# Local Supabase is not running, so status output is unavailable."
  echo "# Start the stack: supabase start"
  echo ""
  echo "# For the hosted project, copy Project URL + anon (publishable) key from:"
  echo "# https://supabase.com/dashboard/project/_/settings/api"
  echo ""
  if supabase projects list 2>/dev/null; then
    echo "# (Projects you have CLI access to are listed above; URL is https://<ref>.supabase.co)"
  else
    echo "# Optional: supabase login && supabase projects list"
  fi
fi
