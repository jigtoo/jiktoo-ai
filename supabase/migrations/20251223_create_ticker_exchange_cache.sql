-- Create persistent cache for ticker exchange mappings
-- This table stores learned exchange codes to avoid repeated Polygon API calls

CREATE TABLE IF NOT EXISTS public.ticker_exchange_cache (
    ticker TEXT PRIMARY KEY,
    exchange_code TEXT NOT NULL CHECK (exchange_code IN ('NAS', 'NYS', 'AMS', 'BAT', 'CHX')),
    market TEXT NOT NULL DEFAULT 'US' CHECK (market IN ('KR', 'US')),
    last_verified TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticker_exchange_cache_ticker 
ON public.ticker_exchange_cache(ticker);

-- RLS
ALTER TABLE public.ticker_exchange_cache ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (client needs this for caching)
CREATE POLICY "Allow everyone to read ticker exchange cache"
ON public.ticker_exchange_cache FOR SELECT 
TO authenticated, anon, service_role 
USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to manage ticker exchange cache"
ON public.ticker_exchange_cache FOR ALL 
TO service_role 
USING (true) WITH CHECK (true);

COMMENT ON TABLE public.ticker_exchange_cache IS 'Persistent cache for US stock ticker exchange codes to reduce Polygon API usage';
