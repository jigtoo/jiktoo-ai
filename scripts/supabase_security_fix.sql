-- [Project Awakening] Security Hardening Script
-- Run this in the Supabase SQL Editor to resolve the 59 detected issues.

-- 1. Enable Row Level Security (RLS) on all detected tables
-- (Even if no policy is added yet, enabling RLS silences the warning and denies access by default for anon)

ALTER TABLE public.market_ingest_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_signal_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiwoom_screener_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpha_cards_latest_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_config_bak_utc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_subscriptions_bak_utc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trade_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoir_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_freeze_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddl_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_healing_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_guard_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.megatrend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.long_term_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.megatrend_analysis_history ENABLE ROW LEVEL SECURITY;

-- 2. Create a default "Service Role Full Access" policy for these tables
-- This ensures the backend (Service Role) can still access everything, while blocking public/anon.
-- Note: Service Role bypasses RLS anyway, but good to be explicit if we ever use authenticated users.

-- Example for one table (Repeated for critical ones if needed, but RLS on defaults to Deny All for anon)

-- 3. Fix "Security Definer" Views
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- Best practice is to set security_invoker = true (Postgres 15+) or remove SECURITY DEFINER.
-- We will attempt to set security_invoker for the reported views.

ALTER VIEW public.v_ingest_health_dashboard SET (security_invoker = true);
ALTER VIEW public.v_risk_news_neg SET (security_invoker = true);
ALTER VIEW public.v_signal_brief SET (security_invoker = true);
ALTER VIEW public.v_ai_budget_dashboard SET (security_invoker = true);
ALTER VIEW public.ai_evolution_timeline SET (security_invoker = true);
ALTER VIEW public.v_exec_kpi_deltas_latest SET (security_invoker = true);
ALTER VIEW public.v_dashboard_stock SET (security_invoker = true);
ALTER VIEW public.v_system_signal_log SET (security_invoker = true);
ALTER VIEW public.v_weekly_deformations SET (security_invoker = true);
ALTER VIEW public.v_evolution_daily_summary SET (security_invoker = true);
ALTER VIEW public.v_risk_normalized_events SET (security_invoker = true);
ALTER VIEW public.v_alpha_card_enriched SET (security_invoker = true);
ALTER VIEW public.v_cron_job_runs_latest SET (security_invoker = true);
ALTER VIEW public.v_cron_job_run_details SET (security_invoker = true);
ALTER VIEW public.v_risk_spike_candidates SET (security_invoker = true);
ALTER VIEW public.v_alpha_score_components SET (security_invoker = true);
ALTER VIEW public.v_risk_watch_latest SET (security_invoker = true);
ALTER VIEW public.v_policy_status SET (security_invoker = true);
ALTER VIEW public.v_alpha_preview_latest SET (security_invoker = true);
ALTER VIEW public.v_risk_alert_dashboard SET (security_invoker = true);
ALTER VIEW public.v_exec_kpi_delta_v2 SET (security_invoker = true);
ALTER VIEW public.v_performance_stats_summary SET (security_invoker = true);
ALTER VIEW public.v_exec_kpi_summary_7d_latest SET (security_invoker = true);
ALTER VIEW public.v_risk_health_dashboard SET (security_invoker = true);
ALTER VIEW public.collector_health SET (security_invoker = true);
ALTER VIEW public.v_risk_tuning_log SET (security_invoker = true);
ALTER VIEW public.v_kpi_trends SET (security_invoker = true);
ALTER VIEW public.v_system_signal_status SET (security_invoker = true);

-- Done.
