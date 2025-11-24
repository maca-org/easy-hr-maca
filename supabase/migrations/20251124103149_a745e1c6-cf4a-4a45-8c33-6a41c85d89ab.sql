-- Rename jobs table to job_openings
ALTER TABLE jobs RENAME TO job_openings;

-- Add title column
ALTER TABLE job_openings ADD COLUMN title TEXT;

-- Add updated_at column with default value
ALTER TABLE job_openings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_job_openings_updated_at
BEFORE UPDATE ON job_openings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();