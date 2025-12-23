-- Add column to track if limit warning email was sent this billing cycle
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS limit_warning_sent boolean DEFAULT false;