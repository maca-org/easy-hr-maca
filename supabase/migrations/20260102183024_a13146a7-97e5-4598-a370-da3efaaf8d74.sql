-- Drop the trigger that creates profiles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger that sends welcome email on signup
DROP TRIGGER IF EXISTS on_new_user_send_welcome_email ON public.profiles;

-- The functions can remain, we just disable the triggers
-- This way signup only creates auth.users entry, nothing else