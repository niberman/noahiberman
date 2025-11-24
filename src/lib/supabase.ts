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
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          message: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contact_messages']['Insert']>;
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

