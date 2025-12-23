-- CLEAN_DB_AND_INJECT.sql
-- Shadow Trader 대시보드가 'aggressive' (0원) 계좌를 우선 표시하는 문제를 해결하기 위해
-- 0원짜리 불필요한 포트폴리오 데이터를 삭제하고, 'balanced' 데이터를 확실하게 보존합니다.

-- 1. 잘못된 데이터 삭제 (aggressive, jiktoo_picks 등 0원이거나 null인 것들)
DELETE FROM public.ai_trader_portfolios 
WHERE style != 'balanced';

-- 2. KR 국장 'balanced' 확인 및 재주입 (50,000,000원)
INSERT INTO public.ai_trader_portfolios (market, style, data, updated_at)
VALUES (
    'KR', 
    'balanced', 
    '{
        "cash": 50000000,
        "currentValue": 50000000,
        "initialCapital": 50000000,
        "holdings": [],
        "tradeLogs": [],
        "investmentStyle": "balanced",
        "profitOrLoss": 0,
        "profitOrLossPercent": 0
    }'::jsonb,
    NOW()
)
ON CONFLICT (market, style) 
DO UPDATE SET 
    data = EXCLUDED.data,
    updated_at = NOW();

-- 3. US 미장 'balanced' 확인 및 재주입 ($30,000)
INSERT INTO public.ai_trader_portfolios (market, style, data, updated_at)
VALUES (
    'US', 
    'balanced', 
    '{
        "cash": 30000,
        "currentValue": 30000,
        "initialCapital": 30000,
        "holdings": [],
        "tradeLogs": [],
        "investmentStyle": "balanced",
        "profitOrLoss": 0,
        "profitOrLossPercent": 0
    }'::jsonb,
    NOW()
)
ON CONFLICT (market, style) 
DO UPDATE SET 
    data = EXCLUDED.data,
    updated_at = NOW();

-- 결과 확인
SELECT market, style, data->>'cash' as cash FROM public.ai_trader_portfolios;
