-- Add stock_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alpha_core_signals' AND column_name = 'stock_name') THEN
        ALTER TABLE public.alpha_core_signals ADD COLUMN stock_name TEXT;
    END IF;
END $$;

-- Add adjusted_score column if it doesn't exist (instead of 'score')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alpha_core_signals' AND column_name = 'adjusted_score') THEN
        ALTER TABLE public.alpha_core_signals ADD COLUMN adjusted_score NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Create index for faster queries (using adjusted_score)
CREATE INDEX IF NOT EXISTS idx_alpha_core_signals_market_adj_score ON public.alpha_core_signals(market, adjusted_score DESC);
CREATE INDEX IF NOT EXISTS idx_alpha_core_signals_created_at ON public.alpha_core_signals(created_at DESC);

-- Enable RLS
ALTER TABLE public.alpha_core_signals ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
DROP POLICY IF EXISTS "Allow public read access" ON public.alpha_core_signals;
CREATE POLICY "Allow public read access" ON public.alpha_core_signals FOR SELECT USING (true);

-- Create policy to allow authenticated insert/update
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.alpha_core_signals;
CREATE POLICY "Allow authenticated insert" ON public.alpha_core_signals FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update" ON public.alpha_core_signals;
CREATE POLICY "Allow authenticated update" ON public.alpha_core_signals FOR UPDATE USING (auth.role() = 'authenticated');
