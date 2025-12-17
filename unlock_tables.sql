
-- Disable RLS on key tables to prevent frontend blocked access
ALTER TABLE public.ai_thought_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trader_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_results DISABLE ROW LEVEL SECURITY;
