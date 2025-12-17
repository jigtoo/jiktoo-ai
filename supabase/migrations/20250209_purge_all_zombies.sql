-- [NUCLEAR OPTION] PURGE ALL ZOMBIE DATA
-- This script clears all scanner results and playbooks to ensure a fresh start.
-- It does NOT drop tables, only deletes rows.

BEGIN;

-- 1. Clear Alpha Engine Playbooks (The main display)
DELETE FROM public.alpha_engine_playbooks;

-- 2. Clear Scanner Results (The sources of zombies)
-- These tables store the raw scan results that kept feeding the playbooks
DELETE FROM public.bfl_scanner_results;
DELETE FROM public.material_radar_results;
DELETE FROM public.chart_pattern_screener_results;
DELETE FROM public.coin_stock_scanner_results;

-- 3. Clear Realtime Signals and Buffer
DELETE FROM public.realtime_signals;

COMMIT;

-- Verification
SELECT 'Alpha Playbooks' as table_name, count(*) as count FROM public.alpha_engine_playbooks
UNION ALL
SELECT 'BFL Results', count(*) FROM public.bfl_scanner_results
UNION ALL
SELECT 'Material Results', count(*) FROM public.material_radar_results;
