-- Add is_favorite column to candidates table
ALTER TABLE public.candidates 
ADD COLUMN is_favorite boolean DEFAULT false;