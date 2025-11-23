# Dashboard System

A fully responsive, single-page personal command center built with React, TypeScript, Tailwind CSS, and Supabase.

## 🎯 Overview

This dashboard serves as a modular "command center" for managing multiple tools and services:

- **AI Agents** - Manage autonomous AI assistants (LinkedIn Post Generator, Auto-Commenter, Scheduler)
- **Personal CRM** - Track contacts, relationships, and follow-ups
- **Current Aircraft** - Monitor aircraft status and location
- **Flight Tracking** - Real-time flight tracking via FlightAware integration
- **AI Post Generator** - Upload content and generate engaging social media posts

## 📁 File Structure

```
src/
├── pages/
│   └── Dashboard.tsx                    # Main dashboard page
├── components/
│   └── dashboard/
│       ├── AIAgentsCard.tsx             # AI agents management card
│       ├── CRMCard.tsx                  # Personal CRM card
│       ├── AircraftCard.tsx             # Aircraft status card
│       ├── FlightTrackingCard.tsx       # Flight tracking card
│       └── UploadAgentCard.tsx          # AI post generator card
│
supabase/
├── migrations/
│   ├── 20250101000001_create_agents_table.sql
│   ├── 20250101000002_create_uploads_table.sql
│   ├── 20250101000003_create_generated_posts_table.sql
│   ├── 20250101000004_create_crm_contacts_table.sql
│   ├── 20250101000005_create_aircraft_status_table.sql
│   └── 20250101000006_create_flight_tracking_table.sql
│
└── functions/
    ├── generate-post/           # AI post generation endpoint
    ├── crm-contacts/            # CRM CRUD operations
    ├── aircraft-status/         # Aircraft status management
    └── track-flight/            # Flight tracking integration
```

## 🎨 Design System

The dashboard follows your existing design system:

### Colors
- **Primary**: White (`hsl(0 0% 100%)`)
- **Secondary/Accent**: Purple (`hsl(270 60% 50%)`)
- **Background**: Black (`hsl(0 0% 0%)`)
- **Card**: Dark gray (`hsl(0 0% 5%)`)
- **Muted**: Very dark gray (`hsl(0 0% 8%)`)

### Typography
- **Sans**: Inter
- **Display**: Playfair Display

### Animations
- `animate-fade-in` - Fade in with upward movement
- `animate-slide-up` - Slide up animation
- `hover:shadow-elegant` - Elegant hover shadow effect

### Responsive Breakpoints
- **Mobile**: 1 column
- **Tablet** (md): 2 columns
- **Desktop** (lg): 3 columns

## 🗄️ Database Schema

### Tables

#### `agents`
Manages AI agent configurations and status.
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `name` - Agent name
- `type` - Agent type (Content, Engagement, Automation, Analytics, Other)
- `status` - Current status (active, idle, processing, error, disabled)
- `config` - JSONB configuration
- `last_run_at` - Last execution timestamp
- `created_at`, `updated_at` - Timestamps

#### `uploads`
Tracks uploaded content for processing.
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `type` - Upload type (image, text, video, document, other)
- `image_url` - URL to uploaded image
- `text` - Text content
- `metadata` - JSONB additional data
- `status` - Processing status (pending, processing, completed, failed)
- `created_at`, `updated_at` - Timestamps

#### `generated_posts`
Stores AI-generated social media posts.
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `upload_id` - Foreign key to uploads
- `content` - Generated post content
- `platform` - Target platform (linkedin, twitter, facebook, instagram, other)
- `status` - Post status (draft, scheduled, published, archived)
- `metadata` - JSONB additional data
- `scheduled_at` - Scheduled publish time
- `published_at` - Actual publish time
- `created_at`, `updated_at` - Timestamps

#### `crm_contacts`
Personal CRM for managing contacts and relationships.
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `name` - Contact name
- `email` - Email address
- `phone` - Phone number
- `company` - Company name
- `position` - Job position
- `notes` - Additional notes
- `tags` - Array of tags
- `priority` - Priority level (low, medium, high)
- `status` - Contact status (active, inactive, archived)
- `last_contacted_at` - Last contact timestamp
- `follow_up_date` - Follow-up date
- `metadata` - JSONB additional data
- `created_at`, `updated_at` - Timestamps

#### `aircraft_status`
Tracks current aircraft status and location.
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `aircraft_tail_number` - Aircraft tail number
- `aircraft_type` - Aircraft type/model
- `airport_base` - Base airport
- `status` - Current status (On Ground, En Route, Training, Maintenance)
- `location` - Current location
- `metadata` - JSONB additional data
- `last_updated` - Last update timestamp
- `created_at` - Creation timestamp

#### `flight_tracking`
Stores tracked flight information.
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `fa_flight_id` - FlightAware flight ID
- `flight_number` - Flight number
- `origin` - Origin airport
- `destination` - Destination airport
- `departure_time` - Scheduled departure
- `arrival_time` - Scheduled arrival
- `aircraft` - Aircraft type
- `status` - Flight status (On Time, Delayed, Departed, Arrived, Cancelled)
- `tracking_data` - JSONB real-time tracking data
- `created_at`, `updated_at` - Timestamps

## 🔌 API Endpoints

All endpoints are implemented as Supabase Edge Functions:

### `/generate-post` (POST)
Generate AI social media posts from text/image input.

**Request:**
```json
{
  "textInput": "Your text content",
  "imageUrl": "https://...",
  "platform": "linkedin"
}
```

**Response:**
```json
{
  "success": true,
  "post": "Generated post content...",
  "postId": "uuid"
}
```

### `/crm-contacts` (GET, POST, PUT, DELETE)
CRUD operations for CRM contacts.

**GET** - Fetch all contacts
**POST** - Create new contact
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "notes": "Met at conference",
  "tags": ["client", "vip"],
  "follow_up_date": "2025-01-15"
}
```

**PUT** - Update contact
```json
{
  "id": "uuid",
  "notes": "Updated notes"
}
```

**DELETE** - Delete contact
```json
{
  "id": "uuid"
}
```

### `/aircraft-status` (GET, POST)
Manage aircraft status.

**GET** - Fetch current aircraft status

**POST** - Update aircraft status
```json
{
  "aircraft_tail_number": "N12345",
  "aircraft_type": "Cessna 172",
  "airport_base": "KPAO",
  "status": "On Ground",
  "location": "KPAO - Palo Alto"
}
```

### `/track-flight` (POST)
Track a flight by flight number or FA flight ID.

**Request:**
```json
{
  "flightIdentifier": "UA1234"
}
```

**Response:**
```json
{
  "success": true,
  "flight": {
    "fa_flight_id": "FA-XYZ123",
    "flight_number": "UA1234",
    "origin": "San Francisco International",
    "destination": "Los Angeles International",
    "departure_time": "2025-01-01T14:30:00Z",
    "arrival_time": "2025-01-01T16:15:00Z",
    "aircraft": "Boeing 737-800",
    "status": "Departed",
    "tracking_data": {
      "altitude": 35000,
      "speed": 450,
      "heading": 180,
      "latitude": 36.7783,
      "longitude": -119.4179
    }
  }
}
```

## 🚀 Setup Instructions

### 1. Run Supabase Migrations

```bash
# Make sure Supabase is running locally
supabase start

# Run all migrations
supabase db reset

# Or apply migrations individually
supabase db push
```

### 2. Deploy Supabase Functions

```bash
# Deploy all functions
supabase functions deploy generate-post
supabase functions deploy crm-contacts
supabase functions deploy aircraft-status
supabase functions deploy track-flight
```

### 3. Access the Dashboard

Navigate to `/dashboard` in your browser:

```
http://localhost:5173/dashboard
```

## 🔐 Security

All tables use Row Level Security (RLS) policies:
- Users can only access their own data
- Authenticated users required for all operations
- Secure by default

## 🎯 Future Enhancements

This dashboard is designed to be easily expandable. To add a new card:

1. Create a new component in `src/components/dashboard/`
2. Import and add it to the grid in `Dashboard.tsx`
3. Create Supabase migration if needed
4. Add corresponding API endpoint if needed

Example:
```tsx
// src/components/dashboard/NewFeatureCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const NewFeatureCard = () => {
  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <CardTitle>New Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your content */}
      </CardContent>
    </Card>
  );
};
```

## 📱 Mobile Responsiveness

All cards are fully responsive:
- Touch-friendly buttons and inputs
- Optimized spacing for mobile
- Readable text sizes across all devices
- Smooth animations that respect prefers-reduced-motion

## 🔧 Maintenance

### Updating a Card
Simply edit the corresponding file in `src/components/dashboard/`

### Adding Database Fields
1. Create a new migration in `supabase/migrations/`
2. Run `supabase db push`
3. Update TypeScript types in component

### Modifying API Endpoints
Edit files in `supabase/functions/` and redeploy:
```bash
supabase functions deploy [function-name]
```

## 📝 Notes

- All endpoints return mock data by default
- FlightAware integration requires API key (add to function)
- AI post generation requires OpenAI/Anthropic API key (add to function)
- The dashboard uses your existing design tokens - no new styles introduced

