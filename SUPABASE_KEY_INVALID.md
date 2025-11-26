# URGENT: Supabase API Key is Invalid

## Problem
The Supabase anon key in both `.env` and `.env.local` is **invalid**:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Ymx3cGhiZmVrbW1wb3hvd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDg4OTIsImV4cCI6MjA1MDk4NDg5Mn0.3Vr9xLKH_5FO6nYqGBfVfXZBXj8qTFJg4UkQxOh0xQw
```

API response:
```json
{
  "message": "Invalid API key",
  "hint": "Double check your Supabase `anon` or `service_role` API key."
}
```

## Solution: Get the Correct Key from Supabase

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: `yvblwphbfekmmpoxowjr`

### Step 2: Find Your API Keys
1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** under Project Settings
3. Look for the section "Project API keys"

### Step 3: Copy the Correct Keys
You'll see two keys:

**anon (public)** - This is what you need!
```
It will look like: eyJhbGc...xxxxx (starts with eyJ)
```

**service_role (secret)** - DON'T use this in the frontend!

### Step 4: Update Your .env Files

Update both `.env` and `.env.local` with the correct anon key:

```bash
# In your terminal:
cd /Users/noah/noahiberman.com/aviator-founder-folio

# Edit .env
nano .env
# Replace VITE_SUPABASE_ANON_KEY with the correct value
# Press Ctrl+X, Y, Enter to save

# Edit .env.local
nano .env.local
# Replace VITE_SUPABASE_ANON_KEY with the correct value
# Press Ctrl+X, Y, Enter to save
```

### Step 5: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Why Is This Happening?

The key in your files might be:
1. From a different Supabase project
2. An old/expired key
3. Corrupted during copy/paste
4. A test/placeholder key

## Verification

After updating, you can test if the key works:

```bash
curl -X POST 'https://yvblwphbfekmmpoxowjr.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_NEW_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

If the key is valid, you'll get an auth error (not API key error):
```json
{"error":"invalid_grant","error_description":"Invalid login credentials"}
```

If still invalid API key, double-check you copied the right key from Supabase dashboard.

## Check Vercel Too

Since you said it works on Vercel, check what key Vercel is using:
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Look at `VITE_SUPABASE_ANON_KEY`
5. Copy that exact value to your local `.env` files

That's the key that's working in production!



