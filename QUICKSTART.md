# Dashboard Quick Start Guide

Get your dashboard up and running in 5 minutes! 🚀

## Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (`npm install -g supabase`)
- Your project running locally

## Step 1: Start Your Dev Server

```bash
# If using npm
npm run dev

# If using bun
bun dev
```

Your app should be running at `http://localhost:5173`

## Step 2: Setup Supabase

### Option A: Automated Setup (Recommended)

Run the setup script:

```bash
chmod +x scripts/setup-dashboard.sh
./scripts/setup-dashboard.sh
```

This will:
- Start Supabase
- Run all migrations
- Deploy all edge functions

### Option B: Manual Setup

```bash
# 1. Start Supabase
supabase start

# 2. Run migrations
supabase db reset

# 3. Deploy functions
supabase functions deploy generate-post
supabase functions deploy crm-contacts
supabase functions deploy aircraft-status
supabase functions deploy track-flight
```

## Step 3: Access Your Dashboard

Open your browser and navigate to:

```
http://localhost:5173/dashboard
```

## Step 4: Test the Cards

### 🤖 AI Agents Card
- View your active agents
- Click "Generate Post" to test functionality
- Check the Activity Log button

### 👥 Personal CRM Card
- Click "+" to add a new contact
- Fill out the contact form
- View follow-up reminders

### ✈️ Current Aircraft Card
- View current aircraft status
- Click "Update Status" to edit
- Change tail number, type, location, or status
- Click "Save Changes"

### 🛫 Flight Tracking Card
- Enter a flight number (e.g., "UA1234")
- Click "Track Flight"
- View flight details with origin/destination
- See mock tracking data

### 📱 AI Post Generator Card
- Enter text in the snippet area
- Optionally upload an image
- Click "Generate Post"
- Copy, regenerate, or save the result

## Troubleshooting

### Dashboard shows empty cards?
The cards are working with mock data by default. They don't require database connections to display.

### "Supabase not initialized" error?
Make sure you're in the project root directory and Supabase is initialized:
```bash
supabase init  # Only if not already initialized
supabase start
```

### Functions not deploying?
Check that Supabase CLI is updated:
```bash
npm update -g supabase
```

### Port conflicts?
If 5173 is taken, Vite will use another port. Check your console for the actual URL.

## Next Steps

### 1. Connect Real APIs

**OpenAI for Post Generation:**
```bash
# Set environment variable in Supabase
supabase secrets set OPENAI_API_KEY=your_key_here
```

Then update `supabase/functions/generate-post/index.ts` to use OpenAI API.

**FlightAware for Flight Tracking:**
```bash
supabase secrets set FLIGHTAWARE_API_KEY=your_key_here
```

Then update `supabase/functions/track-flight/index.ts` to use FlightAware API.

### 2. Enable Authentication

Add authentication to your app:
```bash
# In your app, users need to be authenticated to use dashboard
# The RLS policies will enforce this automatically
```

### 3. Customize Cards

Edit any card component in `src/components/dashboard/`:
- `AIAgentsCard.tsx`
- `CRMCard.tsx`
- `AircraftCard.tsx`
- `FlightTrackingCard.tsx`
- `UploadAgentCard.tsx`

### 4. Add More Cards

Create a new card component:

```typescript
// src/components/dashboard/MyNewCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const MyNewCard = () => {
  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <CardTitle>My New Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your content here */}
      </CardContent>
    </Card>
  );
};
```

Then add it to `src/pages/Dashboard.tsx`:

```typescript
import { MyNewCard } from "@/components/dashboard/MyNewCard";

// In the grid:
<MyNewCard />
```

## Helpful Commands

```bash
# View Supabase status
supabase status

# View Supabase logs
supabase functions logs --function generate-post

# Reset database (WARNING: Deletes all data)
supabase db reset

# Stop Supabase
supabase stop
```

## Production Deployment

### 1. Deploy to Vercel/Netlify
Your dashboard will deploy automatically with your main app.

### 2. Setup Production Supabase
Link to your production project:
```bash
supabase link --project-ref your-project-ref
```

Push migrations:
```bash
supabase db push
```

Deploy functions:
```bash
supabase functions deploy
```

### 3. Environment Variables
Set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Support

- 📖 Full documentation: `DASHBOARD_README.md`
- 📊 File structure: `DASHBOARD_STRUCTURE.md`
- 📝 Change history: `CHANGELOG.md`
- 💬 Check function logs for debugging
- 🔍 Use browser DevTools for frontend issues

## Tips

1. **Use Mock Data First**: All cards work with mock data initially. Perfect for testing UI/UX.
2. **Start Small**: Get one card fully functional before expanding.
3. **Check RLS Policies**: If data isn't showing, check that user is authenticated.
4. **Monitor Function Logs**: Use `supabase functions logs` to debug API issues.
5. **Responsive Testing**: Use browser DevTools to test mobile/tablet views.

---

🎉 **You're ready to go!** Navigate to `/dashboard` and start building your command center.

For detailed information, see `DASHBOARD_README.md`.

