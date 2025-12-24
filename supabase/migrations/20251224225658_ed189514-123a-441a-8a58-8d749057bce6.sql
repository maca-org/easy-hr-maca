-- 1. Remove deneme@deneme.com from admin role
DELETE FROM public.user_roles 
WHERE role = 'admin' 
AND user_id IN (
  SELECT id FROM auth.users WHERE email = 'deneme@deneme.com'
);

-- 2. Update auto_assign_admin_role function - only admin@candidateassess.com
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admin@candidateassess.com gets admin role
  IF NEW.email = 'admin@candidateassess.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Add account_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'hr' 
CHECK (account_type IN ('hr', 'candidate'));

-- 4. Update handle_new_user function to set account_type based on company_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name, account_type)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data ->> 'company_name',
    CASE 
      WHEN new.raw_user_meta_data ->> 'company_name' IS NOT NULL 
           AND new.raw_user_meta_data ->> 'company_name' != '' 
      THEN 'hr' 
      ELSE 'candidate' 
    END
  );
  RETURN new;
END;
$$;