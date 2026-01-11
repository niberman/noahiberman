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
      uploads: {
        Row: {
          id: string;
          user_id: string | null;
          type: 'image' | 'text' | 'video' | 'document' | 'other';
          image_url: string | null;
          text: string | null;
          metadata: Json | null;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type?: 'image' | 'text' | 'video' | 'document' | 'other';
          image_url?: string | null;
          text?: string | null;
          metadata?: Json | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['uploads']['Row']>;
      };
      generated_posts: {
        Row: {
          id: string;
          user_id: string | null;
          upload_id: string | null;
          content: string;
          platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'other';
          status: 'draft' | 'scheduled' | 'published' | 'archived';
          metadata: Json | null;
          scheduled_at: string | null;
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          upload_id?: string | null;
          content: string;
          platform?: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'other';
          status?: 'draft' | 'scheduled' | 'published' | 'archived';
          metadata?: Json | null;
          scheduled_at?: string | null;
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['generated_posts']['Row']>;
      };
      crm_contacts: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          position: string | null;
          notes: string | null;
          tags: string[] | null;
          priority: 'low' | 'medium' | 'high';
          status: 'active' | 'inactive' | 'archived';
          last_contacted_at: string | null;
          follow_up_date: string | null;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          position?: string | null;
          notes?: string | null;
          tags?: string[] | null;
          priority?: 'low' | 'medium' | 'high';
          status?: 'active' | 'inactive' | 'archived';
          last_contacted_at?: string | null;
          follow_up_date?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['crm_contacts']['Row']>;
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
      ventures: {
        Row: {
          id: string;
          title: string;
          description: string;
          role: string;
          year: string;
          status: 'active' | 'completed' | 'in-progress';
          link: string | null;
          tags: string[] | null;
          subtitle_en: string | null;
          subtitle_es: string | null;
          is_new: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          role: string;
          year: string;
          status?: 'active' | 'completed' | 'in-progress';
          link?: string | null;
          tags?: string[] | null;
          subtitle_en?: string | null;
          subtitle_es?: string | null;
          is_new?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ventures']['Row']>;
      };
      projects: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          year: string;
          technologies: string[] | null;
          link: string | null;
          image: string | null;
          venture_link: string | null;
          venture_name: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          category: string;
          year: string;
          technologies?: string[] | null;
          link?: string | null;
          image?: string | null;
          venture_link?: string | null;
          venture_name?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
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
}

export interface BlogPost {
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
