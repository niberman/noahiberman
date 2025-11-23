#!/bin/bash

# Dashboard Setup Script
# This script helps set up the dashboard system with Supabase

echo "🚀 Dashboard Setup Script"
echo "=========================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if Supabase is initialized
if [ ! -d "supabase" ]; then
    echo "❌ Supabase not initialized in this project"
    echo "   Run: supabase init"
    exit 1
fi

echo "✅ Supabase initialized"
echo ""

# Start Supabase (if not already running)
echo "🔄 Starting Supabase..."
supabase start

echo ""
echo "📊 Running database migrations..."
supabase db reset --force

echo ""
echo "🔧 Deploying Edge Functions..."

# Deploy all functions
echo "  → Deploying generate-post..."
supabase functions deploy generate-post

echo "  → Deploying crm-contacts..."
supabase functions deploy crm-contacts

echo "  → Deploying aircraft-status..."
supabase functions deploy aircraft-status

echo "  → Deploying track-flight..."
supabase functions deploy track-flight

echo ""
echo "✅ Dashboard setup complete!"
echo ""
echo "📱 Next steps:"
echo "  1. Navigate to http://localhost:5173/dashboard"
echo "  2. Sign up or sign in to access your dashboard"
echo "  3. Start using your command center!"
echo ""
echo "📖 For more information, see DASHBOARD_README.md"
echo ""

