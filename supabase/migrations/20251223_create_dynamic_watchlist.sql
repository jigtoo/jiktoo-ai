-- Dynamic Watchlist System (Idempotent version)
-- Safe to run multiple times

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dynamic_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    tier TEXT NOT NULL CHECK (tier IN ('hot', 'active', 'monitor')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 100),
    source TEXT NOT NULL CHECK (source IN ('megatrend', 'volume', 'news', 'sector', 'sniper', 'manual')),
    rationale TEXT,
    market_cap BIGINT,
    avg_volume BIGINT,
    price_change_7d NUMERIC,
    volume_ratio NUMERIC,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    UNIQUE(market, tier, ticker)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_market_tier 
ON public.dynamic_watchlist(market, tier, priority DESC);

CREATE INDEX IF NOT EXISTS idx_watchlist_expires 
ON public.dynamic_watchlist(expires_at) 
WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_watchlist_source 
ON public.dynamic_watchlist(source);

-- RLS
ALTER TABLE public.dynamic_watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow everyone to read watchlist" ON public.dynamic_watchlist;
    DROP POLICY IF EXISTS "Allow service role to manage watchlist" ON public.dynamic_watchlist;
END $$;

CREATE POLICY "Allow everyone to read watchlist"
ON public.dynamic_watchlist FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

CREATE POLICY "Allow service role to manage watchlist"
ON public.dynamic_watchlist FOR ALL 
TO service_role 
USING (true) WITH CHECK (true);

-- Sniper Learning Table
CREATE TABLE IF NOT EXISTS public.sniper_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker TEXT NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    pattern TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    entry_price NUMERIC,
    exit_price NUMERIC,
    profit_pct NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sniper_learning_ticker 
ON public.sniper_learning(ticker, success);

CREATE INDEX IF NOT EXISTS idx_sniper_learning_pattern 
ON public.sniper_learning(pattern, success);

-- RLS for sniper_learning
ALTER TABLE public.sniper_learning ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow everyone to read sniper learning" ON public.sniper_learning;
    DROP POLICY IF EXISTS "Allow service role to manage sniper learning" ON public.sniper_learning;
END $$;

CREATE POLICY "Allow everyone to read sniper learning"
ON public.sniper_learning FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

CREATE POLICY "Allow service role to manage sniper learning"
ON public.sniper_learning FOR ALL 
TO service_role 
USING (true) WITH CHECK (true);
