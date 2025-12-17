-- Supabase Migration: Create tables for Alpha Core and Conviction Scanner persistence
-- This ensures signals are not lost on app restart

-- 1. Alpha Core Results Table
CREATE TABLE IF NOT EXISTS public.alpha_core_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    adjusted_score NUMERIC NOT NULL,
    action_signal TEXT NOT NULL CHECK (action_signal IN ('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL')),
    signal_strength INTEGER NOT NULL CHECK (signal_strength >= 0 AND signal_strength <= 100),
    action_reason TEXT NOT NULL,
    scores JSONB NOT NULL, -- M, F, V, Q, E, base_score, cc_bonus, K
    rationale JSONB NOT NULL, -- mda, gi, cc
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_alpha_core_date_market 
ON public.alpha_core_signals(date DESC, market);

CREATE INDEX IF NOT EXISTS idx_alpha_core_ticker 
ON public.alpha_core_signals(ticker);

CREATE INDEX IF NOT EXISTS idx_alpha_core_action_signal 
ON public.alpha_core_signals(action_signal) 
WHERE is_active = true;

-- 2. Conviction Scanner (BFL) Signals Table
CREATE TABLE IF NOT EXISTS public.conviction_scanner_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    conviction_score INTEGER NOT NULL CHECK (conviction_score >= 0 AND conviction_score <= 100),
    signal_type TEXT NOT NULL, -- 'breakout', 'flow', 'liquidity'
    entry_price NUMERIC,
    target_price NUMERIC,
    stop_loss NUMERIC,
    rationale TEXT NOT NULL,
    catalysts JSONB, -- Array of catalyst strings
    risks JSONB, -- Array of risk strings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conviction_date_market 
ON public.conviction_scanner_signals(date DESC, market);

CREATE INDEX IF NOT EXISTS idx_conviction_ticker 
ON public.conviction_scanner_signals(ticker);

CREATE INDEX IF NOT EXISTS idx_conviction_score 
ON public.conviction_scanner_signals(conviction_score DESC) 
WHERE is_active = true;

-- 3. Signal Performance Tracking Table
CREATE TABLE IF NOT EXISTS public.signal_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signal_id UUID NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('alpha_core', 'conviction_scanner')),
    ticker TEXT NOT NULL,
    entry_date DATE NOT NULL,
    entry_price NUMERIC NOT NULL,
    exit_date DATE,
    exit_price NUMERIC,
    return_pct NUMERIC,
    max_gain_pct NUMERIC,
    max_loss_pct NUMERIC,
    holding_days INTEGER,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_performance_signal 
ON public.signal_performance(signal_id);

CREATE INDEX IF NOT EXISTS idx_performance_outcome 
ON public.signal_performance(outcome);

-- Enable Row Level Security
ALTER TABLE public.alpha_core_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conviction_scanner_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_performance ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read alpha core signals"
ON public.alpha_core_signals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role to insert/update alpha core signals"
ON public.alpha_core_signals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read conviction signals"
ON public.conviction_scanner_signals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role to insert/update conviction signals"
ON public.conviction_scanner_signals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read performance"
ON public.signal_performance
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role to insert/update performance"
ON public.signal_performance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.alpha_core_signals IS 'Stores Alpha Core analysis results with clear BUY/HOLD/SELL signals';
COMMENT ON TABLE public.conviction_scanner_signals IS 'Stores Conviction Scanner (BFL) high-conviction trade signals';
COMMENT ON TABLE public.signal_performance IS 'Tracks performance of signals over time for backtesting and validation';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_alpha_core_updated_at
BEFORE UPDATE ON public.alpha_core_signals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conviction_updated_at
BEFORE UPDATE ON public.conviction_scanner_signals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_updated_at
BEFORE UPDATE ON public.signal_performance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
