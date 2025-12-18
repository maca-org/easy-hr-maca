-- Add slug column to job_openings table
ALTER TABLE public.job_openings 
ADD COLUMN slug TEXT UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_job_openings_slug ON public.job_openings(slug);

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_job_slug(title TEXT, job_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate base slug from title
  base_slug := LOWER(REGEXP_REPLACE(COALESCE(title, job_id::TEXT), '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing dashes
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- If empty, use job_id
  IF base_slug = '' THEN
    base_slug := job_id::TEXT;
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.job_openings WHERE slug = final_slug AND id != job_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update existing jobs with auto-generated slugs
UPDATE public.job_openings 
SET slug = public.generate_job_slug(title, id)
WHERE slug IS NULL;