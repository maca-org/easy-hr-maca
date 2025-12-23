-- 1. CVs bucket'ı private yap
UPDATE storage.buckets 
SET public = false 
WHERE id = 'cvs';

-- 2. Mevcut "Anyone can read CVs" policy'yi kaldır
DROP POLICY IF EXISTS "Anyone can read CVs" ON storage.objects;

-- 3. Sadece iş sahibi kendi adaylarının CV'lerini görebilsin
CREATE POLICY "Job owners can read their candidates CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs' 
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.cv_file_path = name
    AND c.user_id = auth.uid()
  )
);

-- 4. Public apply için CV upload izni (anonim kullanıcılar başvuru yapabilsin)
CREATE POLICY "Anyone can upload CVs for applications"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'cvs');

-- 5. Job openings için public SELECT policy'yi değiştir - sadece slug ile erişim
DROP POLICY IF EXISTS "Anyone can view job openings for applications" ON public.job_openings;

-- 6. Yeni policy: Sadece belirli bir slug ile job görebilsin (application sayfası için)
CREATE POLICY "Public can view jobs by slug or id for applications"
ON public.job_openings
FOR SELECT
TO anon, authenticated
USING (
  -- Herkes sadece slug veya id ile tek job görebilir (listing değil)
  slug IS NOT NULL OR id IS NOT NULL
);