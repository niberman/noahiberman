import { createClient } from '@supabase/supabase-js';

// Support both Vercel integration variables (SUPABASE_*) and Vite variables (VITE_SUPABASE_*)
// For client-side access, we need VITE_ prefix, so check both
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

// Create Supabase client only if env vars are available
// This allows the app to load even if Supabase isn't configured yet
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Export a helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseAnonKey);

// Database types (you can generate these from your Supabase schema later)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: 'Content' | 'Engagement' | 'Automation' | 'Analytics' | 'Other';
          status: 'active' | 'idle' | 'processing' | 'error' | 'disabled';
          config: Json | null;
          last_run_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: 'Content' | 'Engagement' | 'Automation' | 'Analytics' | 'Other';
          status?: 'active' | 'idle' | 'processing' | 'error' | 'disabled';
          config?: Json | null;
          last_run_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['agents']['Row']>;
      };
      aircraft_status: {
        Row: {
          id: string;
          user_id: string | null;
          aircraft_tail_number: string;
          aircraft_type: string;
          airport_base: string | null;
          status: 'On Ground' | 'En Route' | 'Training' | 'Maintenance';
          location: string | null;
          metadata: Json | null;
          last_updated: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          aircraft_tail_number: string;
          aircraft_type: string;
          airport_base?: string | null;
          status?: 'On Ground' | 'En Route' | 'Training' | 'Maintenance';
          location?: string | null;
          metadata?: Json | null;
          last_updated?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['aircraft_status']['Row']>;
      };
      flight_tracking: {
        Row: {
          id: string;
          user_id: string | null;
          fa_flight_id: string;
          flight_number: string | null;
          origin: string;
          destination: string;
          departure_time: string | null;
          arrival_time: string | null;
          aircraft: string | null;
          status: 'On Time' | 'Delayed' | 'Departed' | 'Arrived' | 'Cancelled';
          tracking_data: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          fa_flight_id: string;
          flight_number?: string | null;
          origin: string;
          destination: string;
          departure_time?: string | null;
          arrival_time?: string | null;
          aircraft?: string | null;
          status?: 'On Time' | 'Delayed' | 'Departed' | 'Arrived' | 'Cancelled';
          tracking_data?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['flight_tracking']['Row']>;
      };
      flights: {
        Row: {
          id: string;
          date: string;
          route: Json;
          aircraft: Json;
          duration: string | null;
          status: 'completed' | 'active' | 'upcoming';
          departure_time: string | null;
          arrival_time: string | null;
          altitude: number | null;
          speed: number | null;
          position: Json | null;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          date: string;
          route: Json;
          aircraft: Json;
          duration?: string | null;
          status?: 'completed' | 'active' | 'upcoming';
          departure_time?: string | null;
          arrival_time?: string | null;
          altitude?: number | null;
          speed?: number | null;
          position?: Json | null;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['flights']['Row']>;
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          message: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['contact_messages']['Row']>;
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string | null;
          images: BlogImage[];
          tags: string[] | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string | null;
          images?: BlogImage[];
          tags?: string[] | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['blog_posts']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Blog types
export interface BlogImage {
  url: string;
  alt?: string;
  caption?: string;
  order: number;
}export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  images: BlogImage[];
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}