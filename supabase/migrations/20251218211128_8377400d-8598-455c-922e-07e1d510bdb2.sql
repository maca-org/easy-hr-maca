-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload CVs (for public job applications)
CREATE POLICY "Anyone can upload CVs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'cvs');

-- Allow anyone to read CVs (needed for processing)
CREATE POLICY "Anyone can read CVs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'cvs');

-- Allow authenticated users to delete their CVs
CREATE POLICY "Authenticated users can delete CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cvs');

-- Update candidates RLS: Allow public inserts for link applications
CREATE POLICY "Anyone can apply via public link"
ON public.candidates FOR INSERT
TO anon
WITH CHECK (application_source = 'link_applied');