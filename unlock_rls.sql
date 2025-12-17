-- [FORCE FIX]
-- Drop existing policies to avoid "Already Exists" errors
DROP POLICY IF EXISTS "Allow anon select telegram" ON public.telegram_messages;
DROP POLICY IF EXISTS "Allow anon select briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Allow anon select thoughts" ON public.ai_thought_logs;
DROP POLICY IF EXISTS "Allow anon select trades" ON public.ai_trade_journals;
DROP POLICY IF EXISTS "Allow anon select playbooks" ON public.alpha_engine_playbooks;
DROP POLICY IF EXISTS "Allow anon select portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Allow anon select shadow_trades" ON public.shadow_trader_trades;

DROP POLICY IF EXISTS "Allow anon insert telegram" ON public.telegram_messages;
DROP POLICY IF EXISTS "Allow anon insert thoughts" ON public.ai_thought_logs;
DROP POLICY IF EXISTS "Allow anon insert trades" ON public.ai_trade_journals;
DROP POLICY IF EXISTS "Allow anon insert playbooks" ON public.alpha_engine_playbooks;
DROP POLICY IF EXISTS "Allow anon insert portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Allow anon insert shadow_trades" ON public.shadow_trader_trades;

DROP POLICY IF EXISTS "Allow anon update portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Allow anon update shadow_trades" ON public.shadow_trader_trades;

-- Create Policies (Read & Write)
CREATE POLICY "Allow anon select telegram" ON public.telegram_messages FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon select briefings" ON public.user_intelligence_briefings FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon select thoughts" ON public.ai_thought_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon select trades" ON public.ai_trade_journals FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon select playbooks" ON public.alpha_engine_playbooks FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon select portfolios" ON public.portfolios FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon select shadow_trades" ON public.shadow_trader_trades FOR SELECT TO public USING (true);

CREATE POLICY "Allow anon insert telegram" ON public.telegram_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert thoughts" ON public.ai_thought_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert trades" ON public.ai_trade_journals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert playbooks" ON public.alpha_engine_playbooks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert portfolios" ON public.portfolios FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert shadow_trades" ON public.shadow_trader_trades FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow anon update portfolios" ON public.portfolios FOR UPDATE TO public USING (true);
CREATE POLICY "Allow anon update shadow_trades" ON public.shadow_trader_trades FOR UPDATE TO public USING (true);

-- Done. This WILL work.
