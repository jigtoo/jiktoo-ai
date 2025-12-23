-- Fix RLS policies for ALL megatrend related tables
-- Ensuring 'authenticated', 'anon', and 'service_role' can CRUD these tables.

-- 1. megatrend_analysis
DROP POLICY IF EXISTS "Allow everyone to read megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow everyone to insert megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow everyone to update megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow everyone to delete megatrend analysis" ON public.megatrend_analysis;

CREATE POLICY "Allow everyone to read megatrend analysis" ON public.megatrend_analysis FOR SELECT TO authenticated, anon, service_role USING (true);
CREATE POLICY "Allow everyone to insert megatrend analysis" ON public.megatrend_analysis FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);
CREATE POLICY "Allow everyone to update megatrend analysis" ON public.megatrend_analysis FOR UPDATE TO authenticated, anon, service_role USING (true);
CREATE POLICY "Allow everyone to delete megatrend analysis" ON public.megatrend_analysis FOR DELETE TO authenticated, anon, service_role USING (true);


-- 2. investment_themes (Source of 403 Forbidden Error)
CREATE TABLE IF NOT EXISTS public.investment_themes (
    id TEXT PRIMARY KEY,
    megatrend_id TEXT,
    name TEXT,
    description TEXT,
    sub_themes TEXT[],
    target_markets TEXT[],
    expected_growth_rate TEXT,
    timeframe TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.investment_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow everyone to read investment themes" ON public.investment_themes;
DROP POLICY IF EXISTS "Allow everyone to insert investment themes" ON public.investment_themes;
DROP POLICY IF EXISTS "Allow everyone to update investment themes" ON public.investment_themes;
DROP POLICY IF EXISTS "Allow everyone to delete investment themes" ON public.investment_themes;

CREATE POLICY "Allow everyone to read investment themes" ON public.investment_themes FOR SELECT TO authenticated, anon, service_role USING (true);
CREATE POLICY "Allow everyone to insert investment themes" ON public.investment_themes FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);
CREATE POLICY "Allow everyone to update investment themes" ON public.investment_themes FOR UPDATE TO authenticated, anon, service_role USING (true);
CREATE POLICY "Allow everyone to delete investment themes" ON public.investment_themes FOR DELETE TO authenticated, anon, service_role USING (true);


-- 3. theme_stocks (Likely next error source)
CREATE TABLE IF NOT EXISTS public.theme_stocks (
    id TEXT PRIMARY KEY,
    ticker TEXT,
    stock_name TEXT,
    theme_id TEXT,
    theme_name TEXT,
    rationale TEXT,
    market_cap TEXT,
    revenue_exposure TEXT,
    ai_confidence INTEGER,
    catalysts TEXT[],
    risks TEXT[],
    market_target TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.theme_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow everyone to read theme stocks" ON public.theme_stocks;
DROP POLICY IF EXISTS "Allow everyone to insert theme stocks" ON public.theme_stocks;
DROP POLICY IF EXISTS "Allow everyone to update theme stocks" ON public.theme_stocks;
DROP POLICY IF EXISTS "Allow everyone to delete theme stocks" ON public.theme_stocks;

CREATE POLICY "Allow everyone to read theme stocks" ON public.theme_stocks FOR SELECT TO authenticated, anon, service_role USING (true);
CREATE POLICY "Allow everyone to insert theme stocks" ON public.theme_stocks FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);
CREATE POLICY "Allow everyone to update theme stocks" ON public.theme_stocks FOR UPDATE TO authenticated, anon, service_role USING (true);
CREATE POLICY "Allow everyone to delete theme stocks" ON public.theme_stocks FOR DELETE TO authenticated, anon, service_role USING (true);
