-- CRITICAL FIX: Drop and recreate alpha_engine_playbooks with correct schema
-- The existing table has an old schema that doesn't match the code

BEGIN;

-- Drop the old table (this will delete all data, but it's already empty anyway)
DROP TABLE IF EXISTS public.alpha_engine_playbooks CASCADE;

-- Recreate with the correct schema
CREATE TABLE public.alpha_engine_playbooks (
    id TEXT PRIMARY KEY, -- Use Text for ID as code generates 'eagle-ticker-timestamp' format
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    strategy_name TEXT NOT NULL,
    strategy_summary TEXT,
    ai_confidence NUMERIC,
    key_levels JSONB, -- { entry, stopLoss, target }
    strategy_type TEXT, -- 'DayTrade', 'SwingTrade', 'LongTerm'
    analysis_checklist JSONB DEFAULT '[]'::jsonb,
    is_user_recommended BOOLEAN DEFAULT false,
    source TEXT,
    sources TEXT[], -- Array of strings
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.alpha_engine_playbooks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow authenticated users to select alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to select alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to insert alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to update alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to delete alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR DELETE TO authenticated USING (true);

-- Service role policies
DROP POLICY IF EXISTS "Service role can do everything on alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Service role can do everything on alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alpha_engine_playbooks;

COMMIT;

-- Verify the new schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'alpha_engine_playbooks'
ORDER BY ordinal_position;
