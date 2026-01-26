# Aviator Founder Folio

> **Founder, Pilot, Engineer, Visionary**

![Aviator Founder Folio Banner](https://images.unsplash.com/photo-1474302770737-173ee21bab63?q=80&w=2000&auto=format&fit=crop)

## Overview

Welcome to the digital headquarters of **Noah Berman**.

I am a bilingual pilot and engineer forging solutions where aviation, technology, and culture intersect. This platform is more than just a portfolio—it's a live demonstration of my mission to build companies that create meaningful impact, expand human opportunity, and open pathways to global freedom and mobility.

This project showcases a modern, high-performance web application that integrates real-time data, 3D mapping, and AI-powered tools to create a seamless user experience.

---

## Immersive Experience

### Interactive 3D Flight Map
The centerpiece of this application is a custom-built 3D flight tracking experience.
*   **Ambient Mode**: A 3D globe rotates gently in the background, visualizing global connectivity.
*   **Live Transformation**: As you scroll to the "Follow My Flight" section, the background map seamlessly transitions into an interactive card, allowing you to pan, zoom, and explore flight paths.
*   **Real-Time Tracking**: When I am flying, the map updates live with my aircraft's position, altitude, and speed using ADS-B data.

### Design System
Built with a "Command Center" aesthetic in mind, utilizing dark modes, glassmorphism, and precision typography (Inter & Playfair Display) to reflect the precision of aviation and engineering.

---

## Command Center Dashboard

Behind the public facing site lies a powerful **Owner Dashboard** (`/dashboard`), designed to manage my ventures and digital presence.

### AI Agents
A suite of custom AI tools powered by OpenAI:
*   **LinkedIn Post Generator**: Crafts professional updates based on my latest activities.
*   **Auto-Scheduler**: Intelliigently plans content distribution.

### Aircraft Command
*   **Live Status**: Updates the public site with my current status (On Ground, En Route, Training).
*   **Telematics**: Manages aircraft tail number and tracking configurations.

### Personal CRM & Analytics
*   A custom-built CRM to manage professional relationships and networking, secured by Supabase Row Level Security (RLS).
*   Tracks follow-ups, meeting notes, and connection history.

---

## Technology Stack

This project is built on a modern, type-safe stack designed for performance and scalability.

**Frontend:**
*   **React 18** & **Vite**: Blazing fast development and production builds.
*   **TypeScript**: Rigorous type safety for complex data handling.
*   **Tailwind CSS**: Utility-first styling for rapid UI development.
*   **Shadcn/UI**: Accessible, re-usable component library.
*   **Mapbox GL**: Advanced WebGL mapping visualizations.
*   **Framer Motion**: Smooth, complex animations and transitions.

**Backend & Infrastructure:**
*   **Supabase**: The open source Firebase alternative.
    *   **PostgreSQL**: Robust relational database.
    *   **Edge Functions**: Serverless compute for AI and third-party API integrations.
    *   **Row Level Security (RLS)**: Enterprise-grade data security.
*   **Vercel**: Edge-first deployment platform.

---

## Getting Started

If you wish to run this project locally:

### Prerequisites
*   Node.js (v18+)
*   npm or bun
*   Supabase CLI (for database setup)

### Quick Start

See `QUICKSTART.md` for a 5-minute setup guide.

### Manual Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory (use `.env.example` as template):
    ```env
    VITE_MAPBOX_TOKEN=your_mapbox_token
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

    **Optional: iNoah public chat**
    ```env
    VITE_SUPABASE_FUNCTIONS_URL=your_supabase_url
    VITE_INOAH_FUNCTION_PATH=/functions/v1/inoah-chat
    ```
    The Edge Function expects server-side secrets:
    - `INOAH_AGENT_KEY` (required)
    - `TURNSTILE_SECRET` (optional)

4.  **Database Setup**
    Run the automated setup script:
    ```bash
    ./scripts/setup-dashboard.sh
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```

Visit `http://localhost:5173` to see your application.

---

## Deployment

This project is optimized for deployment on **Vercel**.

1.  Connect your GitHub repository to Vercel.
2.  Configure the build settings (Framework Preset: Vite).
3.  Add the environment variables in the Vercel dashboard.
4.  Deploy!

---

## Documentation

*   **QUICKSTART.md** - 5-minute quick start guide
*   **DASHBOARD_README.md** - Dashboard features and API documentation
*   **DASHBOARD_STRUCTURE.md** - File organization and structure
*   **CHANGELOG.md** - History of fixes and improvements

---

© 2025 Noah Liberman. All rights reserved.
