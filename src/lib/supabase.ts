import { createClient } from '@supabase/supabase-js';

// Support both Vercel integration variables (SUPABASE_*) and Vite variables (VITE_SUPABASE_*)
// For client-side access, we need VITE_ prefix, so check both
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = import.meta.env.PROD
    ? 'Missing Supabase environment variables. Please ensure Vercel integration is properly configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : 'Missing Supabase environment variables. Please check your .env file. You need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      // Add your table types here
      // Example:
      // ventures: {
      //   Row: {
      //     id: string;
      //     title: string;
      //     description: string;
      //     // ... other fields
      //   };
      //   Insert: Omit<Database['public']['Tables']['ventures']['Row'], 'id'>;
      //   Update: Partial<Database['public']['Tables']['ventures']['Insert']>;
      // };
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

