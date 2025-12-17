-- ========================================
-- SHADOW TRADER - 100% Safe Setup Script
-- This script checks if policies exist before creating them.
-- It will NOT fail even if you run it multiple times.
-- ========================================

-- 1. Create Tables (Safe with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.smc_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    fvg JSONB NOT NULL,
    liquidity_sweep JSONB NOT NULL,
    order_block JSONB NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale TEXT NOT NULL,
    entry_price NUMERIC NOT NULL,
    target_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    risk_reward_ratio NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', NULL)),
    signal_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anchored_vwap (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    anchor_date DATE NOT NULL,
    anchor_event TEXT NOT NULL,
    anchor_price NUMERIC NOT NULL,
    vwap_price NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    distance_percent NUMERIC NOT NULL,
    is_support BOOLEAN NOT NULL,
    strength INTEGER NOT NULL CHECK (strength >= 0 AND strength <= 100),
    price_action TEXT NOT NULL CHECK (price_action IN ('approaching', 'bouncing', 'breaking', 'neutral')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.volatility_breakouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    k_value NUMERIC NOT NULL,
    vix_level NUMERIC NOT NULL,
    market_condition TEXT NOT NULL CHECK (market_condition IN ('low_volatility', 'normal', 'high_volatility', 'extreme')),
    previous_day_range NUMERIC NOT NULL,
    open_price NUMERIC NOT NULL,
    breakout_price NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    target_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', NULL)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logic_chains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market_target TEXT NOT NULL,
    primary_keyword TEXT NOT NULL,
    cause TEXT NOT NULL,
    effect TEXT NOT NULL,
    beneficiary_sector TEXT NOT NULL,
    related_tickers JSONB NOT NULL DEFAULT '[]'::jsonb,
    logic_strength NUMERIC NOT NULL,
    alpha_gap NUMERIC NOT NULL,
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alpha_core_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale TEXT NOT NULL,
    entry_price NUMERIC NOT NULL,
    target_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    risk_reward_ratio NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', NULL)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trading_playbooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    stories JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner TEXT NOT NULL UNIQUE,
    positions JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

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

-- 2. Enable RLS (Safe to run multiple times)
ALTER TABLE public.smc_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anchored_vwap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volatility_breakouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logic_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpha_core_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trade_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Conditional Creation using DO blocks)

-- SMC Signals Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'smc_signals' AND policyname = 'Allow authenticated users to read SMC signals') THEN
        CREATE POLICY "Allow authenticated users to read SMC signals" ON public.smc_signals FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'smc_signals' AND policyname = 'Allow service role to manage SMC signals') THEN
        CREATE POLICY "Allow service role to manage SMC signals" ON public.smc_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Anchored VWAP Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anchored_vwap' AND policyname = 'Allow authenticated users to read VWAP') THEN
        CREATE POLICY "Allow authenticated users to read VWAP" ON public.anchored_vwap FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anchored_vwap' AND policyname = 'Allow service role to manage VWAP') THEN
        CREATE POLICY "Allow service role to manage VWAP" ON public.anchored_vwap FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Volatility Breakouts Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'volatility_breakouts' AND policyname = 'Allow authenticated users to read breakouts') THEN
        CREATE POLICY "Allow authenticated users to read breakouts" ON public.volatility_breakouts FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'volatility_breakouts' AND policyname = 'Allow service role to manage breakouts') THEN
        CREATE POLICY "Allow service role to manage breakouts" ON public.volatility_breakouts FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Logic Chains Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logic_chains' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON public.logic_chains FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Alpha Core Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_core_signals' AND policyname = 'Allow authenticated users to read alpha core signals') THEN
        CREATE POLICY "Allow authenticated users to read alpha core signals" ON public.alpha_core_signals FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_core_signals' AND policyname = 'Allow service role to manage alpha core signals') THEN
        CREATE POLICY "Allow service role to manage alpha core signals" ON public.alpha_core_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- AI Token Usage Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_token_usage' AND policyname = 'Allow authenticated users to read token usage') THEN
        CREATE POLICY "Allow authenticated users to read token usage" ON public.ai_token_usage FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_token_usage' AND policyname = 'Allow service role to manage token usage') THEN
        CREATE POLICY "Allow service role to manage token usage" ON public.ai_token_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Trading Playbooks Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_playbooks' AND policyname = 'Allow authenticated users to read trading playbooks') THEN
        CREATE POLICY "Allow authenticated users to read trading playbooks" ON public.trading_playbooks FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_playbooks' AND policyname = 'Allow service role to manage trading playbooks') THEN
        CREATE POLICY "Allow service role to manage trading playbooks" ON public.trading_playbooks FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Portfolios Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolios' AND policyname = 'Allow authenticated users to read portfolios') THEN
        CREATE POLICY "Allow authenticated users to read portfolios" ON public.portfolios FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolios' AND policyname = 'Allow service role to manage portfolios') THEN
        CREATE POLICY "Allow service role to manage portfolios" ON public.portfolios FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- AI Trade Journals Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_trade_journals' AND policyname = 'Allow authenticated users to read trade journals') THEN
        CREATE POLICY "Allow authenticated users to read trade journals" ON public.ai_trade_journals FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_trade_journals' AND policyname = 'Allow service role to manage trade journals') THEN
        CREATE POLICY "Allow service role to manage trade journals" ON public.ai_trade_journals FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Cron Job Runs Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_job_runs' AND policyname = 'Allow authenticated users to read cron jobs') THEN
        CREATE POLICY "Allow authenticated users to read cron jobs" ON public.cron_job_runs FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_job_runs' AND policyname = 'Allow service role to manage cron jobs') THEN
        CREATE POLICY "Allow service role to manage cron jobs" ON public.cron_job_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Create Indexes (Safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_smc_date_market ON public.smc_signals(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_smc_ticker ON public.smc_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_smc_confidence ON public.smc_signals(confidence DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vwap_date_market ON public.anchored_vwap(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_vwap_ticker ON public.anchored_vwap(ticker);
CREATE INDEX IF NOT EXISTS idx_vwap_strength ON public.anchored_vwap(strength DESC);
CREATE INDEX IF NOT EXISTS idx_vwap_price_action ON public.anchored_vwap(price_action) WHERE price_action IN ('approaching', 'bouncing');

CREATE INDEX IF NOT EXISTS idx_breakout_date_market ON public.volatility_breakouts(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_breakout_ticker ON public.volatility_breakouts(ticker);
CREATE INDEX IF NOT EXISTS idx_breakout_condition ON public.volatility_breakouts(market_condition);
CREATE INDEX IF NOT EXISTS idx_breakout_confidence ON public.volatility_breakouts(confidence DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS logic_chains_created_at_idx ON public.logic_chains(created_at DESC);
CREATE INDEX IF NOT EXISTS logic_chains_market_target_idx ON public.logic_chains(market_target);

CREATE INDEX IF NOT EXISTS idx_alpha_core_date_market ON public.alpha_core_signals(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_alpha_core_ticker ON public.alpha_core_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_alpha_core_confidence ON public.alpha_core_signals(confidence DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON public.ai_token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON public.ai_token_usage(model);
CREATE INDEX IF NOT EXISTS idx_token_usage_cost ON public.ai_token_usage(cost_usd DESC);

CREATE INDEX IF NOT EXISTS idx_trading_playbooks_market ON public.trading_playbooks(market);
CREATE INDEX IF NOT EXISTS idx_trading_playbooks_updated_at ON public.trading_playbooks(updated_at DESC);

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

-- 5. Triggers (Safe replacement)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_smc_updated_at ON public.smc_signals;
CREATE TRIGGER update_smc_updated_at BEFORE UPDATE ON public.smc_signals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vwap_updated_at ON public.anchored_vwap;
CREATE TRIGGER update_vwap_updated_at BEFORE UPDATE ON public.anchored_vwap FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_breakout_updated_at ON public.volatility_breakouts;
CREATE TRIGGER update_breakout_updated_at BEFORE UPDATE ON public.volatility_breakouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alpha_core_updated_at ON public.alpha_core_signals;
CREATE TRIGGER update_alpha_core_updated_at BEFORE UPDATE ON public.alpha_core_signals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create Views
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
