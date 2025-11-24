-- Add user_id to job_openings table for data isolation
ALTER TABLE public.job_openings
ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update existing job_openings to have a user_id (set to NULL for now, will be handled in app)
-- New jobs will require user_id to be set

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all operations on jobs" ON public.job_openings;

-- Create strict RLS policies for job_openings - users can only access their own jobs
CREATE POLICY "Users can view their own jobs"
  ON public.job_openings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON public.job_openings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON public.job_openings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON public.job_openings
  FOR DELETE
  USING (auth.uid() = user_id);