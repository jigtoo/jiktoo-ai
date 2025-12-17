-- ========================================
-- JIKTOO AI - COMPLETE DATABASE FIX
-- 모든 데이터 복구 및 RLS 정책 수정
-- ========================================

-- 1. SHADOW TRADER TRADES - created_at 추가
ALTER TABLE public.shadow_trader_trades 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.shadow_trader_trades 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_shadow_trader_trades_created_at 
ON public.shadow_trader_trades(created_at DESC);

-- 2. SHADOW TRADER TRADES - RLS 정책
DROP POLICY IF EXISTS "Allow public read shadow_trader_trades" ON public.shadow_trader_trades;
DROP POLICY IF EXISTS "Allow public insert shadow_trader_trades" ON public.shadow_trader_trades;
DROP POLICY IF EXISTS "Allow public update shadow_trader_trades" ON public.shadow_trader_trades;

CREATE POLICY "Allow public read shadow_trader_trades" 
ON public.shadow_trader_trades FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert shadow_trader_trades" 
ON public.shadow_trader_trades FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update shadow_trader_trades" 
ON public.shadow_trader_trades FOR UPDATE TO public USING (true);

-- 3. PORTFOLIOS - RLS 정책
DROP POLICY IF EXISTS "Allow public read access" ON public.portfolios;
DROP POLICY IF EXISTS "Allow public insert access" ON public.portfolios;
DROP POLICY IF EXISTS "Allow public update access" ON public.portfolios;

CREATE POLICY "Allow public read access" 
ON public.portfolios FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access" 
ON public.portfolios FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.portfolios FOR UPDATE TO public USING (true);

-- 4. AI THOUGHT LOGS - market 컬럼 추가
ALTER TABLE public.ai_thought_logs 
ADD COLUMN IF NOT EXISTS market TEXT;

ALTER TABLE public.ai_thought_logs 
ADD COLUMN IF NOT EXISTS market_target TEXT;

-- 5. AI THOUGHT LOGS - RLS 정책
DROP POLICY IF EXISTS "Allow public read ai_thought_logs" ON public.ai_thought_logs;
DROP POLICY IF EXISTS "Allow public insert ai_thought_logs" ON public.ai_thought_logs;

CREATE POLICY "Allow public read ai_thought_logs" 
ON public.ai_thought_logs FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert ai_thought_logs" 
ON public.ai_thought_logs FOR INSERT TO public WITH CHECK (true);

-- 6. ALPHA ENGINE PLAYBOOKS - RLS 정책 (컨빅션 스캐너 플레이북!)
DROP POLICY IF EXISTS "Allow public read playbooks" ON public.alpha_engine_playbooks;
DROP POLICY IF EXISTS "Allow public insert playbooks" ON public.alpha_engine_playbooks;
DROP POLICY IF EXISTS "Allow public update playbooks" ON public.alpha_engine_playbooks;

CREATE POLICY "Allow public read playbooks" 
ON public.alpha_engine_playbooks FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert playbooks" 
ON public.alpha_engine_playbooks FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update playbooks" 
ON public.alpha_engine_playbooks FOR UPDATE TO public USING (true);

-- 7. USER WATCHLISTS - 테이블 생성 및 RLS
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT gen_random_uuid(), -- Allow null for anonymous users
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, market)
);

ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read all watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Public can insert watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Public can update watchlists" ON public.user_watchlists;

CREATE POLICY "Public can read all watchlists" 
ON public.user_watchlists FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert watchlists" 
ON public.user_watchlists FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can update watchlists" 
ON public.user_watchlists FOR UPDATE TO public USING (true);

-- 8. USER WATCHLISTS - RPC 함수
-- Drop existing functions first
DROP FUNCTION IF EXISTS public.rpc_get_user_watchlist(text);
DROP FUNCTION IF EXISTS public.rpc_upsert_user_watchlist(text, jsonb);

CREATE OR REPLACE FUNCTION public.rpc_get_user_watchlist(p_market TEXT)
RETURNS TABLE(items JSONB) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT items FROM public.user_watchlists 
    WHERE market = p_market 
    LIMIT 1;
$$;

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

-- 9. USER INTELLIGENCE BRIEFINGS - processed_at 컬럼 확인
ALTER TABLE public.user_intelligence_briefings 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ========================================
-- 완료! 이제 페이지를 새로고침하세요
-- ========================================
