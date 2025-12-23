-- INJECT_INITIAL_CAPITAL.sql
-- Shadow Trader의 초기 자금을 강제로 DB에 주입하여 0원 표시 문제를 해결합니다.
-- 이 스크립트는 KR(5,000만원)과 US($30,000) 포트폴리오를 'balanced' (스윙) 스타일로 생성합니다.

-- 1. KR 국장 포트폴리오 주입 (50,000,000원)
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

-- 2. US 미장 포트폴리오 주입 ($30,000)
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

-- 3. (옵션) 백엔드 원장(portfolios)에도 동일하게 주입
-- 기존 portfolios 테이블은 owner 컬럼을 사용하므로, me_KR, me_US로 저장

INSERT INTO public.portfolios (owner, positions, meta, updated_at)
VALUES (
    'me_KR',
    '[]'::jsonb,
    '{
        "cash": 50000000,
        "totalAsset": 50000000,
        "initialCapital": 50000000,
        "tradeLogs": []
    }'::jsonb,
    NOW()
)
ON CONFLICT (owner) 
DO UPDATE SET 
    meta = EXCLUDED.meta,
    updated_at = NOW();

INSERT INTO public.portfolios (owner, positions, meta, updated_at)
VALUES (
    'me_US',
    '[]'::jsonb,
    '{
        "cash": 30000,
        "totalAsset": 30000,
        "initialCapital": 30000,
        "tradeLogs": []
    }'::jsonb,
    NOW()
)
ON CONFLICT (owner) 
DO UPDATE SET 
    meta = EXCLUDED.meta,
    updated_at = NOW();

-- 결과 확인
SELECT market, style, data->>'cash' as cash FROM public.ai_trader_portfolios;
