-- Block unauthenticated users from reading job_openings
CREATE POLICY "Block unauthenticated job reads"
ON public.job_openings
FOR SELECT
TO anon
USING (false);

-- Block unauthenticated users from all operations on notes
CREATE POLICY "Block unauthenticated notes access"
ON public.notes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);