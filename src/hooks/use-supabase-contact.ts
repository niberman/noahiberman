import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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

