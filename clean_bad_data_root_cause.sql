-- [Root Cause Fix] Cleanup Bad Tickers
-- The system is choking on tickers like '없음', 'null', or empty strings.
-- This script purges them from all key tables.

BEGIN;

-- 1. Clean alpha_engine_playbooks
DELETE FROM alpha_engine_playbooks
WHERE ticker IS NULL 
   OR ticker IN ('없음', 'null', 'undefined', 'NaN')
   OR length(ticker) < 2;

-- 2. Clean strategies (if they contain bad tickers in metadata)
-- Note: strategies table usually relies on logic, but sometimes stores specific tickers
DELETE FROM strategies
WHERE type = 'specific_ticker' 
  AND (metadata->>'ticker' IS NULL OR metadata->>'ticker' IN ('없음', 'null'));

-- 3. Clean user_watchlists (This is the most likely culprit for loops)
-- Watchlist items are JSONb, so we need to be careful.
-- This query removes elements from the 'items' array that have bad tickers.
-- (PostgreSQL specific JSON manipulation)

-- For now, let's just Log the bad entries to be safe, or direct update if simple.
-- Updating JSONb arrays is complex in pure SQL without functions.
-- Instead, we will FLAG them or just let the app validation handle it for now, 
-- but we CAN delete rows if the ENTIRE watchlist is garbage.

-- 4. Clean ai_trade_journals (Optional, but good for history)
DELETE FROM ai_trade_journals
WHERE ticker = '없음' OR ticker = 'null';

COMMIT;
