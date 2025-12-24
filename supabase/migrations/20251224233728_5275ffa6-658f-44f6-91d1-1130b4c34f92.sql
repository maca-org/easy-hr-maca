-- Create offer_letters table
CREATE TABLE public.offer_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  job_title text NOT NULL,
  salary_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  pay_period text NOT NULL DEFAULT 'monthly',
  employment_type text NOT NULL DEFAULT 'full-time',
  work_model text NOT NULL DEFAULT 'on-site',
  is_contracted boolean DEFAULT false,
  contract_duration_value integer,
  contract_duration_unit text,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one offer per candidate per job per HR
ALTER TABLE public.offer_letters 
ADD CONSTRAINT unique_offer_per_candidate 
UNIQUE (hr_user_id, candidate_id, job_id);

-- Enable RLS
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own offers"
ON public.offer_letters FOR SELECT
USING (auth.uid() = hr_user_id);

CREATE POLICY "Users can create their own offers"
ON public.offer_letters FOR INSERT
WITH CHECK (auth.uid() = hr_user_id);

CREATE POLICY "Users can update their own offers"
ON public.offer_letters FOR UPDATE
USING (auth.uid() = hr_user_id);

CREATE POLICY "Users can delete their own offers"
ON public.offer_letters FOR DELETE
USING (auth.uid() = hr_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_offer_letters_updated_at
BEFORE UPDATE ON public.offer_letters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();