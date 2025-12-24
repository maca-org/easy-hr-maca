-- Migration: Create authorization system (user_roles, app_role enum, has_role function)
-- These objects already exist in the database but need to be documented in migrations

-- Note: This migration is idempotent - it will not fail if objects already exist

-- 1. Create app_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable Row-Level Security on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create has_role function (drop and recreate to ensure latest version)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create RLS policies for user_roles (only if they don't exist)
DO $$ BEGIN
    -- Admins can view all roles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all roles') THEN
        CREATE POLICY "Admins can view all roles" ON public.user_roles
        FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    
    -- Admins can insert roles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can insert roles') THEN
        CREATE POLICY "Admins can insert roles" ON public.user_roles
        FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
    
    -- Admins can delete roles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can delete roles') THEN
        CREATE POLICY "Admins can delete roles" ON public.user_roles
        FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 6. Create auto_assign_admin_role function if it doesn't exist
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin email list - these emails will automatically become admin when they register
  IF NEW.email IN ('deneme@deneme.com', 'admin@candidateassess.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Create trigger for auto-assigning admin role (if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_role') THEN
        CREATE TRIGGER on_auth_user_created_assign_role
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.auto_assign_admin_role();
    END IF;
END $$;