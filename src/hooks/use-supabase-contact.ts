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
      console.log('Submitting contact message:', { name: message.name, email: message.email });
      console.log('Supabase configured:', isSupabaseConfigured());
      console.log('Supabase client:', supabase ? 'exists' : 'null');
      
      if (!isSupabaseConfigured() || !supabase) {
        const errorMsg = 'Supabase is not configured. Contact message not saved to database.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Inserting into contact_messages table...');
      const { data, error } = await supabase
        .from('contact_messages')
        .insert({
          name: message.name,
          email: message.email,
          message: message.message,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      
      console.log('Contact message saved successfully:', data);
      return data as ContactMessage;
    },
  });
}

