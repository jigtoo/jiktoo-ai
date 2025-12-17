-- Supabase Migration: Create megatrend_analysis table
-- This table stores historical megatrend analysis results

CREATE TABLE IF NOT EXISTS public.megatrend_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market_target TEXT NOT NULL CHECK (market_target IN ('KR', 'US')),
    trends JSONB NOT NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trend_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_megatrend_analysis_market_analyzed 
ON public.megatrend_analysis(market_target, analyzed_at DESC);

-- Enable Row Level Security
ALTER TABLE public.megatrend_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read megatrend analysis"
ON public.megatrend_analysis
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow service role to insert
CREATE POLICY "Allow service role to insert megatrend analysis"
ON public.megatrend_analysis
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.megatrend_analysis IS 'Stores historical megatrend analysis results for tracking trends over time';
