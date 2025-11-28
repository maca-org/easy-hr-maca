-- Add assessment_answers and test_completed_at columns to candidates table
ALTER TABLE public.candidates 
ADD COLUMN assessment_answers jsonb DEFAULT NULL,
ADD COLUMN test_completed_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.candidates.assessment_answers IS 'Stores candidate answers in format: [{"question_id": "uuid", "question_type": "multiple_choice|text", "answer": "...", "time_spent_seconds": 120}]';
COMMENT ON COLUMN public.candidates.test_completed_at IS 'Timestamp when candidate completed the assessment';