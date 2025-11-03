# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/bfadf460-6ad7-404d-9f0b-aa1d666b1c6b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/bfadf460-6ad7-404d-9f0b-aa1d666b1c6b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/bfadf460-6ad7-404d-9f0b-aa1d666b1c6b) and click on Share -> Publish.

### Environment Variables

For Vercel deployment, make sure to set the following environment variables:

- `VITE_MAPBOX_TOKEN`: Your Mapbox access token (get one at https://account.mapbox.com/)
- `VITE_SUPABASE_URL`: Your Supabase project URL (get from https://app.supabase.com/project/_/settings/api)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key (get from https://app.supabase.com/project/_/settings/api)
- `VITE_AEROAPI_TAIL_NUMBER`: Your aircraft tail number (e.g., N12345) - set this when you're flying to enable live flight tracking

**Note**: Mapbox tokens are client-side tokens meant to be bundled into the JavaScript. This is expected behavior and the tokens include URL restrictions for security.

**Important for Vercel + Supabase Integration**: 
If you've connected Supabase through Vercel's integration panel, Vercel may automatically add `SUPABASE_URL` and `SUPABASE_ANON_KEY`. However, for client-side access in Vite, you need the `VITE_` prefix. 

After connecting through Vercel's integration:
1. Go to your Vercel project settings → Environment Variables
2. Verify that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (they should be automatically created)
3. If not, manually add them using the values from your Supabase dashboard
4. Redeploy your application after adding/changing environment variables

## Supabase Setup

This project is configured to use Supabase as the backend. Follow these steps to set it up:

1. **Create a Supabase project** (if you haven't already):
   - Go to https://app.supabase.com/
   - Create a new project
   - Wait for the project to be fully provisioned

2. **Get your API credentials**:
   - Navigate to Project Settings > API
   - Copy your Project URL and anon/public key

3. **Set up environment variables**:
   - Create a `.env` file in the root directory (copy from `.env.example`)
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Create your database tables**:
   - In your Supabase dashboard, go to SQL Editor
   - Create tables matching your data models (ventures, flights, projects, etc.)
   - You can use the existing TypeScript interfaces in `src/data/` as a reference for your schema

5. **Use Supabase hooks**:
   - Import and use the provided hooks in `src/hooks/`:
     - `useVentures()`, `useVenture(id)`, `useCreateVenture()`, etc.
     - `useFlights()`, `useActiveFlight()`, `useCreateFlight()`, etc.
     - `useProjects()`, `useProjectsByCategory()`, etc.
   - These hooks are built on top of React Query and provide caching, refetching, and error handling out of the box.

6. **Example usage**:
   ```tsx
   import { useVentures } from '@/hooks/use-supabase-ventures';
   
   function VenturesPage() {
     const { data: ventures, isLoading, error } = useVentures();
     
     if (isLoading) return <div>Loading...</div>;
     if (error) return <div>Error: {error.message}</div>;
     
     return (
       <div>
         {ventures?.map(venture => (
           <div key={venture.id}>{venture.title}</div>
         ))}
       </div>
     );
   }
   ```

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
