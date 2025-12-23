-- Block unauthenticated users from reading profiles
CREATE POLICY "Block unauthenticated profile reads"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Block unauthenticated users from reading candidates
CREATE POLICY "Block unauthenticated candidate reads"
ON public.candidates
FOR SELECT
TO anon
USING (false);