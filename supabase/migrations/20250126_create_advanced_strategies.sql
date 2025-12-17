-- Supabase Migration: Advanced Trading Strategies Tables
-- SMC Scanner, Anchored VWAP, Volatility Breakout persistence

-- 1. SMC (Smart Money Concepts) Signals Table
CREATE TABLE IF NOT EXISTS public.smc_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    
    -- Fair Value Gap
    fvg JSONB NOT NULL, -- {detected, startPrice, endPrice, gapSize, direction, strength, timestamp}
    
    -- Liquidity Sweep
    liquidity_sweep JSONB NOT NULL, -- {detected, sweptLevel, sweptType, fakeout, volume, reversalStrength}
    
    -- Order Block
    order_block JSONB NOT NULL, -- {priceLevel, strength, type, timestamp, volume}
    
    -- Signal Details
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale TEXT NOT NULL,
    entry_price NUMERIC NOT NULL,
    target_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    risk_reward_ratio NUMERIC NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', NULL)),
    
    -- Timestamps
    signal_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for SMC signals
CREATE INDEX IF NOT EXISTS idx_smc_date_market ON public.smc_signals(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_smc_ticker ON public.smc_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_smc_confidence ON public.smc_signals(confidence DESC) WHERE is_active = true;

-- 2. Anchored VWAP Table
CREATE TABLE IF NOT EXISTS public.anchored_vwap (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    
    -- Anchor Point
    anchor_date DATE NOT NULL,
    anchor_event TEXT NOT NULL, -- "Earnings Report", "52-Week Low", etc.
    anchor_price NUMERIC NOT NULL,
    
    -- VWAP Calculation
    vwap_price NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    distance_percent NUMERIC NOT NULL, -- Distance from VWAP (%)
    
    -- Analysis
    is_support BOOLEAN NOT NULL, -- true = support, false = resistance
    strength INTEGER NOT NULL CHECK (strength >= 0 AND strength <= 100),
    price_action TEXT NOT NULL CHECK (price_action IN ('approaching', 'bouncing', 'breaking', 'neutral')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Anchored VWAP
CREATE INDEX IF NOT EXISTS idx_vwap_date_market ON public.anchored_vwap(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_vwap_ticker ON public.anchored_vwap(ticker);
CREATE INDEX IF NOT EXISTS idx_vwap_strength ON public.anchored_vwap(strength DESC);
CREATE INDEX IF NOT EXISTS idx_vwap_price_action ON public.anchored_vwap(price_action) WHERE price_action IN ('approaching', 'bouncing');

-- 3. Volatility Breakout Signals Table
CREATE TABLE IF NOT EXISTS public.volatility_breakouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    
    -- Volatility Parameters
    k_value NUMERIC NOT NULL,
    vix_level NUMERIC NOT NULL,
    market_condition TEXT NOT NULL CHECK (market_condition IN ('low_volatility', 'normal', 'high_volatility', 'extreme')),
    
    -- Price Data
    previous_day_range NUMERIC NOT NULL,
    open_price NUMERIC NOT NULL,
    breakout_price NUMERIC NOT NULL, -- Entry price
    current_price NUMERIC NOT NULL,
    target_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    
    -- Signal Details
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale TEXT NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', NULL)),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Volatility Breakouts
CREATE INDEX IF NOT EXISTS idx_breakout_date_market ON public.volatility_breakouts(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_breakout_ticker ON public.volatility_breakouts(ticker);
CREATE INDEX IF NOT EXISTS idx_breakout_condition ON public.volatility_breakouts(market_condition);
CREATE INDEX IF NOT EXISTS idx_breakout_confidence ON public.volatility_breakouts(confidence DESC) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.smc_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anchored_vwap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volatility_breakouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read SMC signals"
ON public.smc_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage SMC signals"
ON public.smc_signals FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read VWAP"
ON public.anchored_vwap FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage VWAP"
ON public.anchored_vwap FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read breakouts"
ON public.volatility_breakouts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage breakouts"
ON public.volatility_breakouts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smc_updated_at
BEFORE UPDATE ON public.smc_signals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vwap_updated_at
BEFORE UPDATE ON public.anchored_vwap
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breakout_updated_at
BEFORE UPDATE ON public.volatility_breakouts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.smc_signals IS 'SMC (Smart Money Concepts) signals: FVG, Liquidity Sweeps, Order Blocks';
COMMENT ON TABLE public.anchored_vwap IS 'Anchored VWAP calculations from key events (earnings, 52w high/low)';
COMMENT ON TABLE public.volatility_breakouts IS 'Dynamic K Volatility Breakout signals (Larry Williams strategy)';
