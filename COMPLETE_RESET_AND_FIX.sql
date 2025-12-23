
-- [SHADOW TRADER FACTORY RESET & FIX SCRIPT]
-- This script will:
-- 1. Disable RLS temporarily (or add permissive policies) to ensure cleanup works.
-- 2. Delete ALL data from: ai_trader_portfolios, ai_trader_logs, shadow_trader_trades.
-- 3. Insert fresh Unified Portfolios for KR (50M KRW) and US ($30k).
-- 4. Preserve ai_trade_journals (Learning data).

BEGIN;

-- 1. Permissions / RLS Fix
-- (Ideally run as postgres/service_role)
ALTER TABLE ai_trader_portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_trader_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_trader_trades DISABLE ROW LEVEL SECURITY;

-- 2. Clear Data
DELETE FROM ai_trader_logs;
DELETE FROM shadow_trader_trades;
DELETE FROM ai_trader_portfolios;

-- 3. Insert Fresh Portfolios (Unified Style)
INSERT INTO ai_trader_portfolios (market, style, data, updated_at)
VALUES 
(
  'KR', 
  'unified', 
  jsonb_build_object(
      'cash', 50000000, 
      'totalAsset', 50000000, 
      'positions', '[]'::jsonb, 
      'tradeLogs', '[]'::jsonb, 
      'initialCapital', 50000000
  ),
  NOW()
),
(
  'US', 
  'unified', 
  jsonb_build_object(
      'cash', 30000, 
      'totalAsset', 30000, 
      'positions', '[]'::jsonb, 
      'tradeLogs', '[]'::jsonb, 
      'initialCapital', 30000
  ),
  NOW()
);

-- 4. Re-enable RLS (Optional, can leave disabled if strictly for internal tool usage)
-- ALTER TABLE ai_trader_portfolios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_trader_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shadow_trader_trades ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify
SELECT * FROM ai_trader_portfolios;
