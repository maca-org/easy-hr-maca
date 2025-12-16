-- Add new columns to candidates table for self-application support
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS applicant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS application_source TEXT DEFAULT 'manual_upload',
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidates_applicant_user_id ON public.candidates(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_application_source ON public.candidates(application_source);

-- Add RLS policy for candidates to view their own applications
CREATE POLICY "Candidates can view their own applications" 
ON public.candidates 
FOR SELECT 
USING (auth.uid() = applicant_user_id);

-- Add RLS policy for candidates to insert their own applications
CREATE POLICY "Candidates can create their own applications" 
ON public.candidates 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_user_id AND application_source = 'self_applied');

-- Add RLS policy for candidates to update their own applications (CV upload etc)
CREATE POLICY "Candidates can update their own applications" 
ON public.candidates 
FOR UPDATE 
USING (auth.uid() = applicant_user_id);

-- Create policy for public job viewing (anyone can see job title/description)
CREATE POLICY "Anyone can view job openings for applications"
ON public.job_openings
FOR SELECT
USING (true);