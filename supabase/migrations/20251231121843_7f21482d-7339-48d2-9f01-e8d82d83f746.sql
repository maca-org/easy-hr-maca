-- Enable the pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the trigger function to include extensions in search_path
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Use pg_net to call the welcome email edge function
  PERFORM net.http_post(
    url := 'https://clcryzevpfoxntkczxrg.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'email', NEW.email,
      'companyName', NEW.company_name
    )::text
  );
  RETURN NEW;
END;
$$;