-- Remove the dangerous "Anyone can apply via public link" policy
DROP POLICY IF EXISTS "Anyone can apply via public link" ON public.candidates;

-- Update the candidate insert policy to require proper authentication
-- Candidates can only insert if they are the applicant_user_id
DROP POLICY IF EXISTS "Candidates can create their own applications" ON public.candidates;

CREATE POLICY "Authenticated candidates can create their own applications" 
ON public.candidates 
FOR INSERT 
WITH CHECK (
  auth.uid() = applicant_user_id 
  AND application_source IN ('self_applied', 'link_applied')
);

-- Ensure candidates can view their own applications
DROP POLICY IF EXISTS "Candidates can view their own applications" ON public.candidates;

CREATE POLICY "Candidates can view their own applications" 
ON public.candidates 
FOR SELECT 
USING (auth.uid() = applicant_user_id);

-- Ensure candidates can update their own applications (for assessment answers etc)
DROP POLICY IF EXISTS "Candidates can update their own applications" ON public.candidates;

CREATE POLICY "Candidates can update their own applications" 
ON public.candidates 
FOR UPDATE 
USING (auth.uid() = applicant_user_id)
WITH CHECK (auth.uid() = applicant_user_id);