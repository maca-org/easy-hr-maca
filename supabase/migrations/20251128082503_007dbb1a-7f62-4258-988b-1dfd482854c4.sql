-- Add company_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_name text;

-- Update the handle_new_user function to include company_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data ->> 'company_name'
  );
  RETURN new;
END;
$$;