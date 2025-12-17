
-- Migration: Create alpha_engine_playbooks table
-- Description: Stores flattened trading playbooks for AlphaLink dashboard, replacing the JSON-blob based trading_playbooks approach.

CREATE TABLE IF NOT EXISTS public.alpha_engine_playbooks (
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

-- [DEBUG] FORCE CLEANUP (Idempotent)
-- This deletes ALL existing playbooks to remove "zombie" entries immediately.
DELETE FROM public.alpha_engine_playbooks;

DROP POLICY IF EXISTS "Allow authenticated users to insert alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to insert alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to update alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete alpha_engine_playbooks" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow authenticated users to delete alpha_engine_playbooks" 
ON public.alpha_engine_playbooks FOR DELETE TO authenticated USING (true);

-- Realtime (Safe Idempotent Check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'alpha_engine_playbooks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alpha_engine_playbooks;
    END IF;
END $$;
