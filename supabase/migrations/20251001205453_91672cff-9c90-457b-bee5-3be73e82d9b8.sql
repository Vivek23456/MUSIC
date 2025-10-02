-- Add ad impressions tracking table
CREATE TABLE public.ad_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_type TEXT NOT NULL DEFAULT 'audio',
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  listener_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ad_impressions
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert ad impressions (for tracking)
CREATE POLICY "Anyone can track ad impressions"
ON public.ad_impressions
FOR INSERT
WITH CHECK (true);

-- Users can view their own ad impressions
CREATE POLICY "Users can view their own ad impressions"
ON public.ad_impressions
FOR SELECT
USING (auth.uid() = listener_id OR listener_id IS NULL);

-- Create index for performance
CREATE INDEX idx_ad_impressions_timestamp ON public.ad_impressions(timestamp DESC);

-- Add pending_withdrawal column to artists if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'pending_withdrawal'
  ) THEN
    ALTER TABLE public.artists ADD COLUMN pending_withdrawal NUMERIC DEFAULT 0;
  END IF;
END $$;