-- Add rubric column to job_openings table for storing AI-generated rubrics
ALTER TABLE job_openings ADD COLUMN IF NOT EXISTS rubric jsonb DEFAULT NULL;