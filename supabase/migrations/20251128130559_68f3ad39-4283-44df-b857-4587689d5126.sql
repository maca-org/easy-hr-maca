-- Add test_detailed_scores column to store per-question scoring details
ALTER TABLE public.candidates 
ADD COLUMN test_detailed_scores jsonb DEFAULT NULL;

COMMENT ON COLUMN public.candidates.test_detailed_scores IS 'Stores detailed scoring per question: [{"question_id": "uuid", "score": 0-100, "feedback": "..."}]';