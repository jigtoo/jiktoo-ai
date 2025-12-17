
-- 1. STRATEGIES Table: Stores evolved genomes
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, 
    description TEXT,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')), 
    genome JSONB NOT NULL, 
    performance_metrics JSONB, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false
);

-- 2. SIM_RESULTS Table: Stores simulation history
CREATE TABLE IF NOT EXISTS public.sim_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMPTZ DEFAULT NOW(),
    mode TEXT, -- 'T' or 'M'
    asset TEXT,
    start_date TEXT,
    end_date TEXT,
    final_return NUMERIC,
    config JSONB,
    insight TEXT
);

-- 3. RLS Policies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_results ENABLE ROW LEVEL SECURITY;

-- Strategies policies
DROP POLICY IF EXISTS "Allow public read strategies" ON public.strategies;
DROP POLICY IF EXISTS "Allow public insert strategies" ON public.strategies;
DROP POLICY IF EXISTS "Allow public update strategies" ON public.strategies;

CREATE POLICY "Allow public read strategies" ON public.strategies FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert strategies" ON public.strategies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update strategies" ON public.strategies FOR UPDATE TO public USING (true);

-- Sim Results policies
DROP POLICY IF EXISTS "Allow public read sim_results" ON public.sim_results;
DROP POLICY IF EXISTS "Allow public insert sim_results" ON public.sim_results;

CREATE POLICY "Allow public read sim_results" ON public.sim_results FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert sim_results" ON public.sim_results FOR INSERT TO public WITH CHECK (true);

-- 4. INDEX
CREATE INDEX IF NOT EXISTS idx_strategies_is_active ON public.strategies(is_active);
