
-- Fix RLS Policy for Key Tables to ensure visibility
BEGIN;

-- 1. ai_trader_portfolios
ALTER TABLE ai_trader_portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for all" ON ai_trader_portfolios;
CREATE POLICY "Allow select for all" ON ai_trader_portfolios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert for all" ON ai_trader_portfolios;
CREATE POLICY "Allow insert for all" ON ai_trader_portfolios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update for all" ON ai_trader_portfolios;
CREATE POLICY "Allow update for all" ON ai_trader_portfolios FOR UPDATE USING (true);


-- 2. ai_trade_journals
ALTER TABLE ai_trade_journals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for all" ON ai_trade_journals;
CREATE POLICY "Allow select for all" ON ai_trade_journals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert for all" ON ai_trade_journals;
CREATE POLICY "Allow insert for all" ON ai_trade_journals FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update for all" ON ai_trade_journals;
CREATE POLICY "Allow update for all" ON ai_trade_journals FOR UPDATE USING (true);

-- 3. strategies (Just in case)
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for all" ON strategies;
CREATE POLICY "Allow select for all" ON strategies FOR SELECT USING (true);

COMMIT;
