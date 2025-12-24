-- Admin'ler tüm profilleri görebilir
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin'ler tüm job'ları görebilir
CREATE POLICY "Admins can view all jobs"
ON public.job_openings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin'ler tüm candidate'leri görebilir
CREATE POLICY "Admins can view all candidates"
ON public.candidates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));