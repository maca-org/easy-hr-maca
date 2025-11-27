-- Add assessment tracking columns to candidates table
ALTER TABLE public.candidates 
ADD COLUMN assessment_sent boolean NOT NULL DEFAULT false,
ADD COLUMN assessment_sent_at timestamp with time zone,
ADD COLUMN assessment_due_date timestamp with time zone,
ADD COLUMN assessment_link text;