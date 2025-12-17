-- Migration: Create missing Shadow Trader tables
-- Created: 2025-02-06
-- Description: Creates portfolios, ai_trade_journals, and v_cron_job_runs_latest for Shadow Trader system

-- 1. portfolios table (Virtual Trading Account Storage)
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner TEXT NOT NULL UNIQUE,
    positions JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. ai_trade_journals table (AI Post-Mortem Analysis)
CREATE TABLE IF NOT EXISTS public.ai_trade_journals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    entry_date TIMESTAMPTZ NOT NULL,
    exit_date TIMESTAMPTZ NOT NULL,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC NOT NULL,
    pnl_percent NUMERIC NOT NULL,
    pnl_amount NUMERIC NOT NULL,
    market_condition TEXT,
    strategy_used TEXT NOT NULL,
    entry_reason TEXT,
    exit_reason TEXT,
    outcome_analysis TEXT,
    lessons_learned TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    profit_rate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. cron_job_runs table (for v_cron_job_runs_latest view)
CREATE TABLE IF NOT EXISTS public.cron_job_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trade_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

-- Create Policies for portfolios
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolios' AND policyname = 'Allow authenticated users to read portfolios') THEN
        CREATE POLICY "Allow authenticated users to read portfolios" ON public.portfolios FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolios' AND policyname = 'Allow service role to manage portfolios') THEN
        CREATE POLICY "Allow service role to manage portfolios" ON public.portfolios FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Create Policies for ai_trade_journals
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_trade_journals' AND policyname = 'Allow authenticated users to read trade journals') THEN
        CREATE POLICY "Allow authenticated users to read trade journals" ON public.ai_trade_journals FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_trade_journals' AND policyname = 'Allow service role to manage trade journals') THEN
        CREATE POLICY "Allow service role to manage trade journals" ON public.ai_trade_journals FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Create Policies for cron_job_runs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_job_runs' AND policyname = 'Allow authenticated users to read cron jobs') THEN
        CREATE POLICY "Allow authenticated users to read cron jobs" ON public.cron_job_runs FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_job_runs' AND policyname = 'Allow service role to manage cron jobs') THEN
        CREATE POLICY "Allow service role to manage cron jobs" ON public.cron_job_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON public.portfolios(owner);
CREATE INDEX IF NOT EXISTS idx_portfolios_updated_at ON public.portfolios(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_journals_user_id ON public.ai_trade_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journals_ticker ON public.ai_trade_journals(ticker);
CREATE INDEX IF NOT EXISTS idx_trade_journals_exit_date ON public.ai_trade_journals(exit_date DESC);
CREATE INDEX IF NOT EXISTS idx_trade_journals_strategy ON public.ai_trade_journals(strategy_used);
CREATE INDEX IF NOT EXISTS idx_trade_journals_score ON public.ai_trade_journals(score DESC);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_name ON public.cron_job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_runs_started_at ON public.cron_job_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_runs_status ON public.cron_job_runs(status);

-- Create view for latest cron job runs
DROP VIEW IF EXISTS public.v_cron_job_runs_latest;
CREATE VIEW public.v_cron_job_runs_latest AS
SELECT DISTINCT ON (job_name)
    id,
    job_name,
    status,
    started_at,
    completed_at,
    error_message,
    metadata,
    created_at
FROM public.cron_job_runs
ORDER BY job_name, started_at DESC;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_portfolios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER trigger_update_portfolios_updated_at
    BEFORE UPDATE ON public.portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolios_updated_at();
