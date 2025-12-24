# Login Setup Guide

## Issue: "Invalid API key" Error

When trying to log in to the dashboard with credentials, you see:
```
Invalid API key
```

This is **not** an API key issue - it's coming from Supabase authentication.

## Causes

1. **User doesn't exist** - The email/password combination doesn't exist in Supabase
2. **Wrong password** - The password is incorrect
3. **Auth not enabled** - Email/password authentication might not be enabled in Supabase

## Solution: Create a User in Supabase

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `yvblwphbfekmmpoxowjr`
3. Click **Authentication** in the left sidebar
4. Click **Users** tab
5. Click **Add User** button
6. Enter:
   - Email: `noah@noahiberman.com`
   - Password: (create a secure password)
   - Confirm password
7. Click **Create User**

### Option 2: Using SQL (If you have SQL access)

```sql
-- Insert a user with a hashed password
-- Note: Supabase will handle password hashing automatically through the Auth API
-- This is for reference only - use the dashboard method above instead
```

### Option 3: Using Supabase CLI

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref yvblwphbfekmmpoxowjr

# Create a user
supabase auth create-user noah@noahiberman.com --password YOUR_PASSWORD
```

## Environment Variables Required

Your `.env.local` file should have:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://yvblwphbfekmmpoxowjr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://yvblwphbfekmmpoxowjr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mapbox for Maps
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoi... # Get from https://mapbox.com
```

## Verify Supabase Authentication Setup

1. Go to Supabase Dashboard → Authentication → Providers
2. Make sure **Email** provider is enabled
3. Check **Email Auth** settings:
   - Enable email confirmation: Can be disabled for development
   - Enable email change confirmation: Optional
   - Secure email change: Optional

## Testing the Login

1. Create a user using one of the methods above
2. Restart your dev server: `npm run dev`
3. Go to `/login`
4. Enter the credentials you just created
5. You should be redirected to `/dashboard`

## Troubleshooting

### Still seeing "Invalid API key"?

Check the browser console for the actual error:
```javascript
// The error object might contain more details
console.error('Auth error:', error);
```

### Check Supabase is configured correctly

Run this in your browser console on the login page:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has anon key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### Common Errors

- `Invalid login credentials` - Wrong email or password
- `Email not confirmed` - If email confirmation is required, check your email
- `User not found` - The user doesn't exist in the database yet
- `Invalid API key` - Usually means the Supabase configuration is working but auth failed

## Next Steps

Once you successfully log in, you'll be able to:
- Set your aircraft tail number
- Toggle flight status (Flying/Not Flying)
- Have live flight tracking display on your homepage

## Security Note

For production:
1. Enable email confirmation
2. Use strong passwords
3. Enable MFA (Multi-Factor Authentication) if available
4. Set up proper RLS (Row Level Security) policies in Supabase















