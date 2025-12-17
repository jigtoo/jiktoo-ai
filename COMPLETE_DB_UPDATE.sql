-- ==========================================
-- JIKTOO: COMPLETE DATABASE UPDATE SCRIPT (FIXED)
-- ==========================================

-- 1. Fix 'alpha_engine_playbooks' ID (Auto-generate UUID)
ALTER TABLE alpha_engine_playbooks 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Add Missing Columns to 'strategies' Table
ALTER TABLE public.strategies 
ADD COLUMN IF NOT EXISTS min_score NUMERIC DEFAULT 80,
ADD COLUMN IF NOT EXISTS allocation NUMERIC DEFAULT 0.5;

-- 3. Ensure Default Strategies Exist (Safe Insert without Unique Index)
-- Using WHERE NOT EXISTS to avoid '42P10' error
INSERT INTO strategies (name, market, is_active, min_score, allocation, genome)
SELECT 'GENOME_MOMENTUM', 'US', true, 80, 0.5, '{}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM strategies WHERE name = 'GENOME_MOMENTUM' AND market = 'US'
);

INSERT INTO strategies (name, market, is_active, min_score, allocation, genome)
SELECT 'GENOME_MOMENTUM', 'KR', true, 80, 0.5, '{}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM strategies WHERE name = 'GENOME_MOMENTUM' AND market = 'KR'
);

-- 4. Create 'ai_growth_journals' table
CREATE TABLE IF NOT EXISTS public.ai_growth_journals (
    case_id TEXT PRIMARY KEY,
    type TEXT,
    title TEXT,
    summary TEXT,
    reflection TEXT,
    improvement_point TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    strategy_used TEXT
);

-- 5. Enable RLS
ALTER TABLE public.ai_growth_journals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read journals" ON public.ai_growth_journals;
DROP POLICY IF EXISTS "Allow public insert journals" ON public.ai_growth_journals;
DROP POLICY IF EXISTS "Allow public update journals" ON public.ai_growth_journals;

CREATE POLICY "Allow public read journals" ON public.ai_growth_journals FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert journals" ON public.ai_growth_journals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update journals" ON public.ai_growth_journals FOR UPDATE TO public USING (true);
