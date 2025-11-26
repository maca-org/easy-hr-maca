-- Add CV parsing and analysis columns to candidates table
ALTER TABLE public.candidates
ADD COLUMN cv_text TEXT,
ADD COLUMN extracted_data JSONB,
ADD COLUMN relevance_analysis JSONB,
ADD COLUMN improvement_tips JSONB;