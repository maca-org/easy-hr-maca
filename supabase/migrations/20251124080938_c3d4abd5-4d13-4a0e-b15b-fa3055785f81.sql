-- Remove title column from jobs table
ALTER TABLE public.jobs DROP COLUMN IF EXISTS title;