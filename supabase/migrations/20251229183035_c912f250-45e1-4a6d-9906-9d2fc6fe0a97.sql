-- Add limit_exhausted_sent column to track 100% credit exhaustion email
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS limit_exhausted_sent BOOLEAN DEFAULT FALSE;