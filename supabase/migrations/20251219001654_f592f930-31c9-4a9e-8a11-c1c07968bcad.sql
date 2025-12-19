-- Add plan and billing fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS monthly_unlocked_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_period_start timestamp with time zone DEFAULT now();

-- Add unlock fields to candidates
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS is_unlocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS unlocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS unlocked_by uuid;

-- Create subscription_history table for Stripe integration later
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  amount_cents integer,
  currency text DEFAULT 'usd',
  stripe_subscription_id text,
  stripe_customer_id text,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subscription_history
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription history
CREATE POLICY "Users can view their own subscription history"
ON public.subscription_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription history (for webhook updates via service role)
CREATE POLICY "Service role can manage subscription history"
ON public.subscription_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidates_is_unlocked ON public.candidates(is_unlocked);
CREATE INDEX IF NOT EXISTS idx_candidates_unlocked_by ON public.candidates(unlocked_by);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON public.profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);