-- Supabase Migration: Create tenbagger_reports table
-- Stores long-term investment reports

CREATE TABLE IF NOT EXISTS public.tenbagger_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_tenbagger_reports_market_created 
ON public.tenbagger_reports(market, created_at DESC);

-- RLS
ALTER TABLE public.tenbagger_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read tenbagger reports"
ON public.tenbagger_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert tenbagger reports"
ON public.tenbagger_reports FOR INSERT TO service_role WITH CHECK (true);

COMMENT ON TABLE public.tenbagger_reports IS 'Stores deep-dive analysis reports for potential 10-bagger stocks';
