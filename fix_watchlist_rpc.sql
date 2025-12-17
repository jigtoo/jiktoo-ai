-- Create user_watchlists table and RPC functions
-- This ensures watchlist data is permanently saved in Supabase

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, market)
);

-- 2. Enable RLS
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can insert own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can update own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Public can read all watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Public can insert watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Public can update watchlists" ON public.user_watchlists;

-- Allow public access (simpler for now)
CREATE POLICY "Public can read all watchlists" ON public.user_watchlists FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert watchlists" ON public.user_watchlists FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update watchlists" ON public.user_watchlists FOR UPDATE TO public USING (true);

-- 4. Create RPC function to get watchlist
CREATE OR REPLACE FUNCTION public.rpc_get_user_watchlist(p_market TEXT)
RETURNS TABLE(items JSONB) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT items FROM public.user_watchlists 
    WHERE market = p_market 
    LIMIT 1;
$$;

-- 5. Create RPC function to upsert watchlist
CREATE OR REPLACE FUNCTION public.rpc_upsert_user_watchlist(p_market TEXT, p_items JSONB)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO public.user_watchlists (market, items, updated_at)
    VALUES (p_market, p_items, NOW())
    ON CONFLICT (user_id, market) 
    DO UPDATE SET items = p_items, updated_at = NOW();
$$;

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_watchlists_market ON public.user_watchlists(market);
