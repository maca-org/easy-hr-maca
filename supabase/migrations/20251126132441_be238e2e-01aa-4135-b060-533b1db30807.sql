-- Add cv_file_path column to store the CV file location in storage
ALTER TABLE public.candidates
ADD COLUMN cv_file_path TEXT;

-- Create storage bucket for CV files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-files', 'cv-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for CV files storage
CREATE POLICY "Users can upload their own CV files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cv-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own CV files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cv-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own CV files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cv-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own CV files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cv-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);