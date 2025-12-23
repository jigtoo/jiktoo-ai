-- Fix missing columns in tenbagger_reports
-- This script is safe to run even if the columns already exist.

-- 1. Add created_at if missing
ALTER TABLE public.tenbagger_reports 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add updated_at if missing
ALTER TABLE public.tenbagger_reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add report_data if missing (just in case)
ALTER TABLE public.tenbagger_reports 
ADD COLUMN IF NOT EXISTS report_data JSONB DEFAULT '{}'::jsonb;

-- 4. Re-create the index
DROP INDEX IF EXISTS idx_tenbagger_reports_market_created;
CREATE INDEX idx_tenbagger_reports_market_created 
ON public.tenbagger_reports(market, created_at DESC);

-- 5. Ensure RLS is enabled and policies exist
ALTER TABLE public.tenbagger_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenbagger_reports' AND policyname = 'Allow authenticated users to read tenbagger reports') THEN
        CREATE POLICY "Allow authenticated users to read tenbagger reports" ON public.tenbagger_reports FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenbagger_reports' AND policyname = 'Allow service role to insert tenbagger reports') THEN
        CREATE POLICY "Allow service role to insert tenbagger reports" ON public.tenbagger_reports FOR INSERT TO service_role WITH CHECK (true);
    END IF;
END $$;
