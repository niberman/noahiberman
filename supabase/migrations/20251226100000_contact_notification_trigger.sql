-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call the Edge Function when a new contact message is inserted
CREATE OR REPLACE FUNCTION notify_new_contact_message()
RETURNS TRIGGER AS $$
DECLARE
  webhook_secret TEXT;
  edge_function_url TEXT;
BEGIN
  -- Webhook secret for authentication
  webhook_secret := '068651a3b9cc011f93596285e0d462a5ad55e1365629cf40a26d027084a61fd9';
  edge_function_url := 'https://yvblwphbfekmmpoxowjr.supabase.co/functions/v1/notify_contact_message';
  
  -- Make HTTP POST request to Edge Function
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'name', NEW.name,
        'email', NEW.email,
        'message', NEW.message,
        'created_at', NEW.created_at
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contact_messages table
DROP TRIGGER IF EXISTS on_contact_message_insert ON contact_messages;
CREATE TRIGGER on_contact_message_insert
  AFTER INSERT ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_contact_message();





