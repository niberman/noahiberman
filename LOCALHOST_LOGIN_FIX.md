# Localhost Login Fix

## Problem
Login worked on Vercel but not on localhost with "Invalid API key" error.

## Root Cause
The `.env` file had an invalid Supabase anon key format:
- **Wrong**: `sb_publishable_3iifPQpzteZdZ31zSu0tvg_voaAD3tY` 
- **Correct**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)

Vercel was working because it has the correct environment variables set in its dashboard.

## Solution Applied
Updated `.env` file with the correct JWT token from `.env.local`.

## To Complete the Fix
**You must restart your dev server:**

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

Vite only loads environment variables when it starts, so the server needs to be restarted after `.env` changes.

## Verification
After restarting, the login at `http://localhost:5173/login` should work with your existing credentials.

## Environment Variable Priority
In Vite:
1. `.env.local` (highest priority - used for local overrides)
2. `.env` (default values)
3. Vercel environment variables (production only)

Both files now have the correct keys, so it will work consistently.

