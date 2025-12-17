-- Fix shadow_trader_trades table schema
-- Add missing created_at column (if it doesn't exist) and other critical columns

-- First, check and add created_at if missing
ALTER TABLE public.shadow_trader_trades 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure all required columns exist
ALTER TABLE public.shadow_trader_trades 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shadow_trader_trades_created_at 
ON public.shadow_trader_trades(created_at DESC);

-- Update RLS policies (make sure they exist)
DROP POLICY IF EXISTS "Allow public read shadow_trader_trades" ON public.shadow_trader_trades;
DROP POLICY IF EXISTS "Allow public insert shadow_trader_trades" ON public.shadow_trader_trades;
DROP POLICY IF EXISTS "Allow public update shadow_trader_trades" ON public.shadow_trader_trades;

CREATE POLICY "Allow public read shadow_trader_trades" 
ON public.shadow_trader_trades FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert shadow_trader_trades" 
ON public.shadow_trader_trades FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update shadow_trader_trades" 
ON public.shadow_trader_trades FOR UPDATE TO public USING (true);
