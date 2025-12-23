-- INJECT_INITIAL_CAPITAL_V2.sql
-- "ON CONFLICT" 제약 조건 오류를 피하기 위해, 기존 데이터를 삭제(DELETE)하고 새로 삽입(INSERT)합니다.
-- 이 방식은 Unique Constraint가 없어도 안전하게 작동합니다.

-- 1. 기존 데이터 정리 (중복 방지)
DELETE FROM public.ai_trader_portfolios WHERE market IN ('KR', 'US') AND style = 'balanced';
DELETE FROM public.portfolios WHERE owner IN ('me_KR', 'me_US');

-- 2. KR 국장 포트폴리오 주입 (50,000,000원)
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
);

-- 3. US 미장 포트폴리오 주입 ($30,000)
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
);

-- 4. 백엔드 원장(portfolios) 주입 (참고용)
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
);

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
);

-- 결과 확인
SELECT market, style, data->>'cash' as cash FROM public.ai_trader_portfolios;
