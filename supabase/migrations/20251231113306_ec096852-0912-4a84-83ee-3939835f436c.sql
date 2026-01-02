-- Create a function to send welcome email to new users
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Create trigger to send welcome email after new profile is created
CREATE TRIGGER on_new_user_send_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_on_signup();