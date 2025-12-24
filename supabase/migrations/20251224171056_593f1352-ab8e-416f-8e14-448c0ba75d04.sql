-- Fix RLS policies for candidates and job_openings tables
-- The "Block unauthenticated" policies need to be RESTRICTIVE, not PERMISSIVE
-- PERMISSIVE policies use OR logic, RESTRICTIVE policies use AND logic

-- 1. Drop the ineffective blocking policies for candidates
DROP POLICY IF EXISTS "Block unauthenticated candidate reads" ON public.candidates;

-- 2. Drop the ineffective blocking policy for job_openings
DROP POLICY IF EXISTS "Block unauthenticated job reads" ON public.job_openings;

-- 3. Create RESTRICTIVE policy for candidates that blocks anonymous access
-- This policy uses RESTRICTIVE which means it must pass along with other policies
CREATE POLICY "Require authentication for candidate access"
ON public.candidates
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- 4. Create RESTRICTIVE policy for job_openings that blocks anonymous access
CREATE POLICY "Require authentication for job access"
ON public.job_openings
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- 5. Create RESTRICTIVE policy for notes that blocks anonymous access
DROP POLICY IF EXISTS "Block unauthenticated notes access" ON public.notes;
CREATE POLICY "Require authentication for notes access"
ON public.notes
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- 6. Create RESTRICTIVE policy for profiles that blocks anonymous access
DROP POLICY IF EXISTS "Block unauthenticated profile reads" ON public.profiles;
CREATE POLICY "Require authentication for profile access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);