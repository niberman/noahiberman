import { useMutation } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  message: string;
  created_at?: string;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  message: string;
}

// Submit a contact message
export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: async (message: ContactMessageInput) => {
      if (!isSupabaseConfigured() || !supabase) {
        // If Supabase isn't configured, still resolve but log a warning
        console.warn('Supabase is not configured. Contact message not saved to database.');
        return { ...message, id: 'local', created_at: new Date().toISOString() } as ContactMessage;
      }

      const { data, error } = await supabase
        .from('contact_messages')
        .insert({
          name: message.name,
          email: message.email,
          message: message.message,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ContactMessage;
    },
  });
}

