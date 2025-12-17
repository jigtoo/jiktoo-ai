# 직투 - AI 투자 동반자

이 프로젝트는 직장인 투자자를 위한 AI 기반 투자 보조 도구 '직투'의 프론트엔드 애플리케이션과 백엔드 클라우드 함수를 포함하고 있습니다.

## 시작하기 전에 (매우 중요)

**이 프로젝트는 3개의 독립적인 부분으로 구성되어 있으며, 정상적인 작동을 위해 각각의 설정과 실행이 필요합니다.**

-   **백엔드 (클라우드):** Supabase Edge Functions - 데이터 수집, 외부 API 통신, 알림 발송, 자율 실행을 담당합니다. **(최초 1회 배포 필요)**
-   **백엔드 (로컬):** `kis-proxy` (Node.js/Express) - 한국투자증권(KIS) API와 통신하여 실시간 시세 및 투자자 정보를 중계합니다.
-   **프론트엔드 (로컬):** `copy-of-sepa-ai` (React/Vite) - 수집된 데이터를 시각화하여 보여주는 웹 애플리케이션입니다.

---

### **0단계: Supabase 프로젝트 설정**

#### 가. 클라우드 함수(Edge Function) 배포

1.  Supabase 프로젝트 대시보드에 접속하여 왼쪽 메뉴에서 **Edge Functions** 아이콘을 클릭합니다.
2.  `supabase/functions` 폴더에 있는 각 함수(`collector`, `api-gateway`, `telegram-service` 등)들에 대해 "**Create a new function**"을 클릭하여 동일한 이름으로 함수를 생성합니다.
3.  각 함수에 대해, **폴더에 있는 `index.ts` 파일의 전체 코드를 복사**하여 Supabase 대시보드의 코드 편집기에 붙여넣습니다.
4.  "**Save and Deploy**" 버튼을 클릭하여 각 함수를 배포합니다.

#### 나. 환경 변수(Secrets) 설정

함수가 외부 API를 사용하려면 비밀 키 설정이 **필수**입니다.

1.  Supabase 대시보드 왼쪽 메뉴에서 **Project Settings**(톱니바퀴 아이콘)로 이동 후 **Edge Functions**를 클릭합니다.
2.  "**Secrets**" 섹션에서 "**Add a new secret**"을 클릭하여 **아래 목록의 모든 키들을 하나씩 추가**합니다.

| Name (키 이름) | Value (값) | 용도 |
| :--- | :--- | :--- |
| `NAVER_CLIENT_ID` | (사용자님의 네이버 API 클라이언트 ID) | `api-gateway` (뉴스 검색) |
| `NAVER_CLIENT_SECRET`| (사용자님의 네이버 API 클라이언트 Secret) | `api-gateway` (뉴스 검색) |
| `FMP_API_KEY` | (Financial Modeling Prep API 키) | `api-gateway` (재무 데이터) |
| `FRED_API_KEY` | (FRED API 키) | `api-gateway` (거시 경제 지표) |
| `MARKETAUX_API_KEY` | (MarketAux API 키) | `api-gateway` (뉴스 검색) |
| `POLYGON_API_KEY` | (Polygon.io API 키) | `api-gateway` (미국 주식 시세) |
| `NEWS_API_KEY` | (NewsAPI.org API 키) | `api-gateway` (뉴스 검색) |
| `TELEGRAM_BOT_TOKEN` | (사용자님의 텔레그램 봇 토큰) | `telegram-service` & `push-system-signals` |

#### 다. 자동화 스케줄 설정
자율 시스템이 주기적으로 작동하려면 Supabase의 스케줄러를 설정해야 합니다.

1.  **Edge Functions** 메뉴로 이동합니다.
2.  `push-system-signals`, `executor-run`, `adaptation-run` 각 함수에 대해 "**Schedules**" 탭을 선택하고 아래와 같이 스케줄을 생성합니다.
    -   `push-system-signals`: `*/1 * * * *` (1분마다)
    -   `executor-run`: `*/2 * * * *` (2분마다)
    -   `adaptation-run`: `*/10 * * * *` (10분마다)

#### 라. 데이터베이스 스키마 및 정책 설정 (필수)

**아래 SQL 스크립트 전체를 복사하여 Supabase SQL Editor에 붙여넣고 "RUN"을 클릭하세요.** 이 스크립트는 모든 테이블과 보안 정책을 최신 상태로 설정하며, **여러 번 실행해도 안전합니다.**

-- =========================================================================================
-- START OF SQL SCRIPT - COPY EVERYTHING FROM THIS LINE DOWN TO THE "END OF SQL SCRIPT" LINE
-- =========================================================================================

-- JIKTOO Full Database Schema & RLS Policies (v7.43 - Performance Stats Update)
-- This script is safe to run multiple times and handles pre-existing older schemas.

-- STEP 0: Drop all known views to remove dependencies before altering tables.
DROP VIEW IF EXISTS public.v_weekly_deformations_summary CASCADE;
DROP VIEW IF EXISTS public.v_market_health_latest CASCADE;
DROP VIEW IF EXISTS public.v_exec_alpha_brief CASCADE;
DROP VIEW IF EXISTS public.v_evolution_daily_summary CASCADE;
DROP VIEW IF EXISTS public.ai_evolution_timeline CASCADE;
DROP VIEW IF EXISTS public.collector_health CASCADE;
DROP VIEW IF EXISTS public.v_signal_queue_status CASCADE;
DROP VIEW IF EXISTS public.v_system_signal_log CASCADE;
DROP VIEW IF EXISTS public.v_cron_job_run_details CASCADE;
DROP VIEW IF EXISTS public.v_exec_kpi_summary_7d_latest CASCADE;
DROP VIEW IF EXISTS public.v_kpi_latest_deltas CASCADE;
DROP VIEW IF EXISTS public.v_alpha_preview_latest CASCADE;
DROP VIEW IF EXISTS public.v_performance_stats_summary CASCADE;


-- [ROBUSTNESS FIX] STEP 0.5: Drop all known functions to allow recreation with new signatures.
DROP FUNCTION IF EXISTS public.rpc_subscribe_telegram(text, uuid);
DROP FUNCTION IF EXISTS public.rpc_get_portfolio_my();
DROP FUNCTION IF EXISTS public.rpc_upsert_portfolio_my(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.get_all_briefings();
DROP FUNCTION IF EXISTS public.insert_briefing(text, text, text, text);
DROP FUNCTION IF EXISTS public.rpc_get_user_watchlist(text);
DROP FUNCTION IF EXISTS public.rpc_upsert_user_watchlist(text, jsonb);
DROP FUNCTION IF EXISTS public.rpc_get_value_pivot_history(text);
DROP FUNCTION IF EXISTS public.rpc_upsert_value_pivot_history(text, jsonb);
DROP FUNCTION IF EXISTS public.rpc_get_daily_quant_metrics(text);
DROP FUNCTION IF EXISTS public.rpc_populate_mock_quant_data(text);
DROP FUNCTION IF EXISTS public.rpc_get_brainwave_events();


-- =============================================
-- 1. FOUNDATIONAL TABLES & ROBUST MIGRATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.portfolios ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), owner uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, positions jsonb NOT NULL DEFAULT '{}'::jsonb, meta jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.user_watchlist ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, owner uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, market text NOT NULL, items jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE(owner, market) );
CREATE TABLE IF NOT EXISTS public.user_analysis_history ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, owner uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, market text NOT NULL, history_data jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE(owner, market) );
CREATE TABLE IF NOT EXISTS public.user_value_pivot_history ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, owner uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, market text NOT NULL, results jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE(owner, market) );
CREATE TABLE IF NOT EXISTS public.user_strategies ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, owner uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamp with time zone NOT NULL DEFAULT now(), name text NOT NULL, description text NOT NULL, rules jsonb NOT NULL, backtest_result jsonb NOT NULL, is_active boolean NOT NULL DEFAULT false, market text NOT NULL );
CREATE TABLE IF NOT EXISTS public.ai_trader_logs ( market text NOT NULL, style text NOT NULL, logs jsonb, updated_at timestamp with time zone, PRIMARY KEY (market, style) );
CREATE TABLE IF NOT EXISTS public.ai_trader_portfolios ( market text NOT NULL, style text NOT NULL, data jsonb, updated_at timestamp with time zone, PRIMARY KEY (market, style) );
CREATE TABLE IF NOT EXISTS public.watchlist_items ( market text NOT NULL PRIMARY KEY, items jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.tenbagger_reports ( market text NOT NULL PRIMARY KEY, report_data jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.trading_playbooks ( market text NOT NULL PRIMARY KEY, stories jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.portfolio_chat_history ( market text NOT NULL PRIMARY KEY, messages jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.bfl_scanner_results ( market text NOT NULL PRIMARY KEY, results jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.coin_stock_scanner_results ( market text NOT NULL PRIMARY KEY, results jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.material_radar_results ( market text NOT NULL PRIMARY KEY, results jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.chart_pattern_screener_results ( market text NOT NULL PRIMARY KEY, results jsonb, updated_at timestamp with time zone );
CREATE TABLE IF NOT EXISTS public.alpha_engine_playbooks ( market text NOT NULL PRIMARY KEY, playbook jsonb, generated_at timestamp with time zone );

-- [NEW] Table for pre-calculated quant metrics for Alpha Core
CREATE TABLE IF NOT EXISTS public.daily_quant_metrics (
    date date NOT NULL,
    market text NOT NULL,
    ticker text NOT NULL,
    stock_name text,
    metrics jsonb,
    gi jsonb,
    mda jsonb,
    risk jsonb,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (date, market, ticker)
);


-- [FIX] Add unique index to portfolios table to support upsert by market
CREATE UNIQUE INDEX IF NOT EXISTS portfolios_owner_market_idx ON public.portfolios (owner, (meta->>'market'));

-- ROBUST MIGRATION for community_posts
CREATE TABLE IF NOT EXISTS public.community_posts ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, author text NOT NULL, content text NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now(), downvotes integer NOT NULL DEFAULT 0, market text NOT NULL, stock_name text NOT NULL, ticker text NOT NULL, title text NOT NULL, upvotes integer NOT NULL );
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS owner uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.intelligence_briefings ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), title text NOT NULL, content text NOT NULL, related_tickers text, source_url text );
CREATE TABLE IF NOT EXISTS public."JIKTOO_memoir" ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), case_type text NOT NULL, title text NOT NULL, content jsonb, market text NOT NULL );
CREATE TABLE IF NOT EXISTS public.ai_predictions ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), market text NOT NULL, prediction_type text NOT NULL, prediction_data jsonb, is_reviewed boolean NOT NULL DEFAULT false, price_at_prediction double precision );
CREATE TABLE IF NOT EXISTS public.growth_journal ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), prediction_id uuid REFERENCES public.ai_predictions(id), entry_data jsonb );
CREATE TABLE IF NOT EXISTS public.ai_learning_reports ( id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), market text, window_from timestamp with time zone, window_to timestamp with time zone, total_msgs integer, top_channels jsonb, top_keywords jsonb, sample_msgs jsonb, summary text );
CREATE TABLE IF NOT EXISTS public.model_training_log ( id uuid default gen_random_uuid() not null primary key, trained_at timestamp with time zone not null, model_version text not null, training_sample_count integer, accuracy double precision, improvement_note text, market text not null );
CREATE TABLE IF NOT EXISTS public.alert_accuracy_log ( id uuid default gen_random_uuid() not null primary key, date date not null, total_alerts integer, true_positives integer, false_positives integer, false_negatives integer, market text not null );
CREATE TABLE IF NOT EXISTS public.feedback_reflection_log ( id uuid default gen_random_uuid() not null primary key, date date not null, feedback_received integer, feedback_applied integer, market text not null );
CREATE TABLE IF NOT EXISTS public.rule_change_log ( id uuid default gen_random_uuid() not null primary key, changed_at timestamp with time zone not null, rule_type text, target text, before_value text, after_value text, market text not null );
CREATE TABLE IF NOT EXISTS public.alert_explanation ( id uuid default gen_random_uuid() not null primary key, alert_id text not null, top_keywords text[], supporting_sentences text[], similarity_score double precision, explanation text, market text not null, created_at timestamp with time zone default now() not null );
CREATE TABLE IF NOT EXISTS public.ddl_audit_log ( id bigserial primary key, event_tstamp timestamptz not null default now(), event_type text, event_tag text, event_user text, event_query text );
CREATE TABLE IF NOT EXISTS public.execution_queue ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), target_system text NOT NULL, command_type text NOT NULL, command_payload jsonb, status text NOT NULL DEFAULT 'pending', priority integer NOT NULL DEFAULT 0, requested_by text NOT NULL, attempts integer NOT NULL DEFAULT 0 );
CREATE TABLE IF NOT EXISTS public.execution_log ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, queue_id uuid NOT NULL REFERENCES public.execution_queue(id) ON DELETE CASCADE, started_at timestamp with time zone, completed_at timestamp with time zone, status text NOT NULL, result_summary text, kpi_metrics_before jsonb, kpi_metrics_after jsonb, error_details text, processed_for_feedback boolean NOT NULL DEFAULT false );
CREATE TABLE IF NOT EXISTS public.policy_guard_rules ( id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, rule_name text NOT NULL UNIQUE, rule_pattern text NOT NULL, action text NOT NULL DEFAULT 'ALLOW'::text, reason text, is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.execution_guard_log ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, queue_id uuid NOT NULL REFERENCES public.execution_queue(id) ON DELETE CASCADE, checked_at timestamp with time zone NOT NULL DEFAULT now(), format_check_result text NOT NULL, policy_check_result text NOT NULL, matched_rule_id bigint REFERENCES public.policy_guard_rules(id), violated_rule_name text, impact_simulation_result jsonb, final_decision text NOT NULL, decision_reason text );
CREATE TABLE IF NOT EXISTS public.view_version_history ( id bigserial PRIMARY KEY, log_id uuid NOT NULL REFERENCES public.execution_log(id) ON DELETE CASCADE, view_name text NOT NULL, view_definition text NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.policy_rule_set_history ( id bigserial PRIMARY KEY, log_id uuid NOT NULL REFERENCES public.execution_log(id) ON DELETE CASCADE, rules_snapshot jsonb NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.self_healing_proposals ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), source_job_id uuid NOT NULL REFERENCES public.execution_queue(id) ON DELETE CASCADE, proposed_sql text NOT NULL, status text NOT NULL DEFAULT 'pending', priority integer NOT NULL DEFAULT 10, requested_by text, approved_by uuid REFERENCES auth.users(id), approved_at timestamp with time zone, notes text );
CREATE TABLE IF NOT EXISTS public.execution_signatures ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, signature_hash text NOT NULL UNIQUE, success_count integer NOT NULL DEFAULT 0, failure_count integer NOT NULL DEFAULT 0, score numeric NOT NULL DEFAULT 0.5, auto_approve_threshold numeric NOT NULL DEFAULT 0.8, is_auto_approve_enabled boolean NOT NULL DEFAULT false, created_at timestamp with time zone NOT NULL DEFAULT now(), last_updated_at timestamp with time zone NOT NULL DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.adaptation_log ( id bigserial PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), summary jsonb );
CREATE TABLE IF NOT EXISTS public.sys_config ( key text NOT NULL PRIMARY KEY, value text NOT NULL, updated_at timestamp with time zone DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.system_signal_rules ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, event_type text NOT NULL, severity text, channel text NOT NULL, route_key text, dedupe_window_sec integer NOT NULL DEFAULT 300, is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone DEFAULT now() );
CREATE TABLE IF NOT EXISTS public.system_signal_outbox ( id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), event_type text NOT NULL, payload jsonb, route_key text, delivery_status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, last_attempt_at timestamp with time zone, delivered_at timestamp with time zone, last_error text, dedupe_key text );
CREATE TABLE IF NOT EXISTS public.evolution_signal_snapshot ( id bigserial PRIMARY KEY, ticker text NOT NULL, stock_name text, sources jsonb, rationale text, confidence numeric );
CREATE TABLE IF NOT EXISTS public.evolution_playbook_snapshot ( id bigserial PRIMARY KEY, market text NOT NULL, playbook_data jsonb, source_generated_at timestamp with time zone );

-- [α-Link] New table for Alpha-Link
CREATE TABLE IF NOT EXISTS public.realtime_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    ticker TEXT NOT NULL,
    stock_name TEXT,
    rationale TEXT NOT NULL,
    weight NUMERIC DEFAULT 0.5,
    meta JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source, ticker, rationale) -- Idempotency
);
-- [ROBUSTNESS FIX] Ensure the stock_name and weight columns exist for users migrating from older schemas.
-- This prevents the "column does not exist" error when creating views.
ALTER TABLE public.realtime_signals ADD COLUMN IF NOT EXISTS stock_name TEXT;
ALTER TABLE public.realtime_signals ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0.5;


-- MIGRATION for evolution snapshot tables
ALTER TABLE public.evolution_signal_snapshot ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE public.evolution_playbook_snapshot ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

-- ROBUST MIGRATION for telegram_subscriptions
CREATE TABLE IF NOT EXISTS public.telegram_subscriptions ( chat_id text NOT NULL PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now() );
ALTER TABLE public.telegram_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid NULL;

-- Clean recreate for telegram_messages
DROP TABLE IF EXISTS public.telegram_messages CASCADE;
CREATE TABLE public.telegram_messages ( id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT now(), message text NOT NULL, market text NOT NULL, channel text );

-- =============================================
-- 2. RLS POLICIES (Row Level Security) - SECURE VERSION
-- =============================================
ALTER TABLE public.sys_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quant_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.daily_quant_metrics;
CREATE POLICY "Allow public read access" ON public.daily_quant_metrics FOR SELECT USING (true);


DROP POLICY IF EXISTS "Allow service_role access" ON public.sys_config;
CREATE POLICY "Allow service_role access" ON public.sys_config FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "Allow service_role access" ON public.execution_queue;
CREATE POLICY "Allow service_role access" ON public.execution_queue FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "Allow anon insert for realtime signals" ON public.realtime_signals;
CREATE POLICY "Allow anon insert for realtime signals" ON public.realtime_signals FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read for realtime signals" ON public.realtime_signals;
CREATE POLICY "Allow public read for realtime signals" ON public.realtime_signals FOR SELECT USING (true);


-- [FIX] Add policy to allow authenticated users to enqueue jobs from the UI.
DROP POLICY IF EXISTS "Allow authenticated users to enqueue jobs" ON public.execution_queue;
CREATE POLICY "Allow authenticated users to enqueue jobs" ON public.execution_queue FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert for subscriptions" ON public.telegram_subscriptions;
CREATE POLICY "Allow anon insert for subscriptions" ON public.telegram_subscriptions FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow individual access for subscriptions" ON public.telegram_subscriptions;
CREATE POLICY "Allow individual access for subscriptions" ON public.telegram_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow service_role access for subscriptions" ON public.telegram_subscriptions;
CREATE POLICY "Allow service_role access for subscriptions" ON public.telegram_subscriptions FOR ALL TO service_role USING (true);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual access" ON public.portfolios;
CREATE POLICY "Allow individual access" ON public.portfolios FOR ALL USING (auth.uid() = owner);
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual access" ON public.user_watchlist;
CREATE POLICY "Allow individual access" ON public.user_watchlist FOR ALL USING (auth.uid() = owner);
ALTER TABLE public.user_analysis_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual access" ON public.user_analysis_history;
CREATE POLICY "Allow individual access" ON public.user_analysis_history FOR ALL USING (auth.uid() = owner);
ALTER TABLE public.user_value_pivot_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual access" ON public.user_value_pivot_history;
CREATE POLICY "Allow individual access" ON public.user_value_pivot_history FOR ALL USING (auth.uid() = owner);
ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual access" ON public.user_strategies;
CREATE POLICY "Allow individual access" ON public.user_strategies FOR ALL USING (auth.uid() = owner);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.community_posts;
CREATE POLICY "Allow public read access" ON public.community_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow individual write access" ON public.community_posts;
CREATE POLICY "Allow individual write access" ON public.community_posts FOR ALL USING (auth.uid() = owner);

-- [FIX] RLS policies for public read access are now split into multiple lines for readability.
ALTER TABLE public.ai_trader_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.ai_trader_logs;
CREATE POLICY "Allow public read access" ON public.ai_trader_logs FOR SELECT USING (true);

ALTER TABLE public.ai_trader_portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.ai_trader_portfolios;
CREATE POLICY "Allow public read access" ON public.ai_trader_portfolios FOR SELECT USING (true);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.watchlist_items;
CREATE POLICY "Allow public read access" ON public.watchlist_items FOR SELECT USING (true);

ALTER TABLE public.tenbagger_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.tenbagger_reports;
CREATE POLICY "Allow public read access" ON public.tenbagger_reports FOR SELECT USING (true);

ALTER TABLE public.trading_playbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.trading_playbooks;
CREATE POLICY "Allow public read access" ON public.trading_playbooks FOR SELECT USING (true);

ALTER TABLE public.portfolio_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.portfolio_chat_history;
CREATE POLICY "Allow public read access" ON public.portfolio_chat_history FOR SELECT USING (true);

ALTER TABLE public.bfl_scanner_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.bfl_scanner_results;
CREATE POLICY "Allow public read access" ON public.bfl_scanner_results FOR SELECT USING (true);

ALTER TABLE public.coin_stock_scanner_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.coin_stock_scanner_results;
CREATE POLICY "Allow public read access" ON public.coin_stock_scanner_results FOR SELECT USING (true);

ALTER TABLE public.material_radar_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.material_radar_results;
CREATE POLICY "Allow public read access" ON public.material_radar_results FOR SELECT USING (true);

ALTER TABLE public.chart_pattern_screener_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.chart_pattern_screener_results;
CREATE POLICY "Allow public read access" ON public.chart_pattern_screener_results FOR SELECT USING (true);

ALTER TABLE public.alpha_engine_playbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.alpha_engine_playbooks;
CREATE POLICY "Allow public read access" ON public.alpha_engine_playbooks FOR SELECT USING (true);

ALTER TABLE public.intelligence_briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.intelligence_briefings;
CREATE POLICY "Allow public read access" ON public.intelligence_briefings FOR SELECT USING (true);

ALTER TABLE public."JIKTOO_memoir" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public."JIKTOO_memoir";
CREATE POLICY "Allow public read access" ON public."JIKTOO_memoir" FOR SELECT USING (true);

ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.ai_predictions;
CREATE POLICY "Allow public read access" ON public.ai_predictions FOR SELECT USING (true);

ALTER TABLE public.growth_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.growth_journal;
CREATE POLICY "Allow public read access" ON public.growth_journal FOR SELECT USING (true);

ALTER TABLE public.evolution_signal_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.evolution_signal_snapshot;
CREATE POLICY "Allow public read access" ON public.evolution_signal_snapshot FOR SELECT USING (true);

ALTER TABLE public.evolution_playbook_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.evolution_playbook_snapshot;
CREATE POLICY "Allow public read access" ON public.evolution_playbook_snapshot FOR SELECT USING (true);

-- =============================================
-- 3. VIEWS
-- =============================================
CREATE OR REPLACE VIEW public.v_weekly_deformations_summary AS SELECT date_trunc('week', ddl.event_tstamp) AS week_start, ddl.event_tag, count(*) AS event_count FROM public.ddl_audit_log ddl GROUP BY date_trunc('week', ddl.event_tstamp), ddl.event_tag ORDER BY week_start DESC, event_count DESC; GRANT SELECT ON public.v_weekly_deformations_summary TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_market_health_latest AS WITH latest_log AS (SELECT * FROM public.execution_log WHERE (result_summary::jsonb->>'command_type' = 'MARKET_HEALTH_ANALYSIS') AND status = 'done' ORDER BY completed_at DESC LIMIT 1) SELECT id as log_id, completed_at as freshness_ts, result_summary::jsonb ->> 'status' as status, result_summary::jsonb ->> 'notes' as notes FROM latest_log; GRANT SELECT ON public.v_market_health_latest TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_exec_alpha_brief AS SELECT l.completed_at as created_at, l.result_summary::jsonb ->> 'notes' as content FROM public.execution_log l WHERE ((l.result_summary::jsonb ->> 'command_type') = 'MARKET_HEALTH_ANALYSIS') AND (l.status = 'done'::text) ORDER BY l.completed_at DESC LIMIT 1; GRANT SELECT ON public.v_exec_alpha_brief TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_evolution_daily_summary AS SELECT d.d::date, (SELECT count(*) FROM public.evolution_signal_snapshot WHERE created_at::date = d.d) AS signal_snapshots, (SELECT count(*) FROM public.evolution_playbook_snapshot WHERE created_at::date = d.d) AS playbook_snapshots FROM generate_series((now() - '7 days'::interval), now(), '1 day'::interval) d(d); GRANT SELECT ON public.v_evolution_daily_summary TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_signal_queue_status AS SELECT count(*) FILTER (WHERE delivery_status = 'pending') AS pending_signals, count(*) FILTER (WHERE delivery_status = 'error' AND last_attempt_at >= (now() - '24 hours'::interval)) AS failed_signals_24h, max(delivered_at) AS last_sent_at FROM public.system_signal_outbox; GRANT SELECT ON public.v_signal_queue_status TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_system_signal_log AS SELECT id, event_type, delivery_status, created_at, payload, last_error FROM public.system_signal_outbox ORDER BY created_at DESC LIMIT 100; GRANT SELECT ON public.v_system_signal_log TO anon, authenticated;

-- [NEW] View for performance stats
CREATE OR REPLACE VIEW public.v_performance_stats_summary AS
WITH journal_with_type AS (
  SELECT
    gj.id,
    gj.created_at,
    gj.entry_data,
    p.prediction_data ->> 'strategyType' AS strategy_type
  FROM public.growth_journal AS gj
  JOIN public.ai_predictions AS p
    ON gj.prediction_id = p.id
  WHERE
    p.prediction_type = 'AlphaEnginePlaybook'
),
total AS (
  SELECT count(*) AS total_reviewed
  FROM journal_with_type
),
success AS (
  SELECT count(*) AS total_success
  FROM journal_with_type
  WHERE entry_data ->> 'caseType' = 'Success Case'
),
swing AS (
  SELECT
    count(*) AS swing_count,
    count(*) FILTER (WHERE entry_data ->> 'caseType' = 'Success Case') AS swing_success
  FROM journal_with_type
  WHERE strategy_type = 'SwingTrade'
),
day_trade AS (
  SELECT
    count(*) AS day_trade_count,
    count(*) FILTER (WHERE entry_data ->> 'caseType' = 'Success Case') AS day_trade_success
  FROM journal_with_type
  WHERE strategy_type = 'DayTrade'
)
SELECT
  total.total_reviewed,
  CASE WHEN total.total_reviewed > 0 THEN (success.total_success::numeric / total.total_reviewed) * 100 ELSE 0 END AS success_rate,
  swing.swing_count,
  CASE WHEN swing.swing_count > 0 THEN (swing.swing_success::numeric / swing.swing_count) * 100 ELSE 0 END AS swing_success_rate,
  day_trade.day_trade_count,
  CASE WHEN day_trade.day_trade_count > 0 THEN (day_trade.day_trade_success::numeric / day_trade.day_trade_count) * 100 ELSE 0 END AS day_trade_success_rate,
  (SELECT MAX(created_at) FROM journal_with_type) as last_updated_ts
FROM total, success, swing, day_trade;
GRANT SELECT ON public.v_performance_stats_summary TO anon, authenticated;


-- [ROBUSTNESS FIX] Conditionally create the v_cron_job_run_details view to prevent script failure if pg_cron is not enabled.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job_run_details') THEN
        CREATE OR REPLACE VIEW public.v_cron_job_run_details AS
        SELECT runid, command, status, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
    ELSE
        -- Create a dummy view with the same structure but no data if pg_cron is not enabled.
        CREATE OR REPLACE VIEW public.v_cron_job_run_details AS
        SELECT 0::bigint AS runid, 'pg_cron extension not enabled'::text AS command, 'n/a'::text AS status, now() AS start_time
        WHERE false; -- This ensures the view returns no rows.
    END IF;
END;
$$ LANGUAGE plpgsql;
GRANT SELECT ON public.v_cron_job_run_details TO anon, authenticated;

CREATE OR REPLACE VIEW public.ai_evolution_timeline AS (SELECT '모델 학습' AS event_type, concat('모델 버전: ', model_version, E'\n개선 사항: ', improvement_note) AS content, trained_at AS created_at FROM public.model_training_log ORDER BY trained_at DESC LIMIT 20) UNION ALL (SELECT '규칙 변경' AS event_type, concat('대상: ', target, E'\n변경 전: ', before_value, E'\n변경 후: ', after_value) AS content, changed_at AS created_at FROM public.rule_change_log ORDER BY changed_at DESC LIMIT 20) UNION ALL (SELECT '알림 평가' AS event_type, concat('정탐: ', true_positives, ', 오탐: ', false_positives, ', 미탐: ', false_negatives) AS content, date AS created_at FROM public.alert_accuracy_log ORDER BY date DESC LIMIT 20) UNION ALL (SELECT '피드백 반영' AS event_type, concat('받은 피드백: ', feedback_received, ', 반영된 피드백: ', feedback_applied) AS content, date AS created_at FROM public.feedback_reflection_log ORDER BY date DESC LIMIT 20) UNION ALL (SELECT '판단 근거 기록 (XAI)' AS event_type, explanation AS content, created_at FROM public.alert_explanation ORDER BY created_at DESC LIMIT 20) UNION ALL (SELECT '텔레그램 메시지' AS event_type, message AS content, created_at FROM public.telegram_messages ORDER BY created_at DESC LIMIT 100) UNION ALL (SELECT '인텔리전스 브리핑' AS event_type, concat(title, E'\n', content) AS content, created_at FROM public.intelligence_briefings ORDER BY created_at DESC LIMIT 20); GRANT SELECT ON public.ai_evolution_timeline TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_exec_kpi_summary_7d_latest AS SELECT avg((kpi_metrics_after ->> 'return_gap_7d')::numeric - (kpi_metrics_before ->> 'return_gap_7d')::numeric) AS avg_delta_return_gap_7d, avg((kpi_metrics_after ->> 'bad_follow_rate_7d')::numeric - (kpi_metrics_before ->> 'bad_follow_rate_7d')::numeric) AS avg_delta_bad_follow_rate_7d, avg((kpi_metrics_after ->> 'coverage_pct_7d')::numeric - (kpi_metrics_before ->> 'coverage_pct_7d')::numeric) AS avg_delta_coverage, count(*) AS execution_count FROM public.execution_log WHERE completed_at >= (now() - '7 days'::interval) AND kpi_metrics_before IS NOT NULL AND kpi_metrics_after IS NOT NULL AND status = 'done'; GRANT SELECT ON public.v_exec_kpi_summary_7d_latest TO anon, authenticated;
CREATE OR REPLACE VIEW public.v_kpi_latest_deltas AS SELECT id AS log_id, completed_at, (result_summary::jsonb ->> 'command_type') as command_type, (kpi_metrics_after ->> 'return_gap_7d')::numeric - (kpi_metrics_before ->> 'return_gap_7d')::numeric AS delta_return_gap_7d, (kpi_metrics_after ->> 'bad_follow_rate_7d')::numeric - (kpi_metrics_before ->> 'bad_follow_rate_7d')::numeric AS delta_bad_follow_rate_7d, (kpi_metrics_after ->> 'coverage_pct_7d')::numeric - (kpi_metrics_before ->> 'coverage_pct_7d')::numeric AS delta_coverage FROM public.execution_log WHERE completed_at >= (now() - '7 days'::interval) AND kpi_metrics_before IS NOT NULL AND kpi_metrics_after IS NOT NULL AND status = 'done' ORDER BY completed_at DESC LIMIT 20; GRANT SELECT ON public.v_kpi_latest_deltas TO anon, authenticated;

-- [α-Link] FIX for v_alpha_preview_latest view
CREATE OR REPLACE VIEW public.v_alpha_preview_latest AS
SELECT
    rs.ticker,
    (array_agg(rs.stock_name ORDER BY rs.detected_at DESC))[1] as stock_name,
    array_agg(DISTINCT rs.source) AS sources,
    (array_agg(rs.rationale ORDER BY rs.detected_at DESC))[1] AS rationale,
    (array_agg(rs.weight ORDER BY rs.detected_at DESC))[1] AS ai_score_normalized,
    (regexp_matches(
        (array_agg(rs.rationale ORDER BY rs.detected_at DESC))[1],
        '(\d{1,3}(,\d{3})*(\.\d+)?원?|\$\d+(\.\d+)?)'
    ))[1] AS pivot_point_text,
    MAX(rs.detected_at) AS updated_at
FROM
    public.realtime_signals rs
WHERE
    rs.detected_at >= NOW() - INTERVAL '24 hours'
GROUP BY
    rs.ticker;
GRANT SELECT ON public.v_alpha_preview_latest TO anon, authenticated;


-- =============================================
-- 4. RPC FUNCTIONS (Remote Procedure Calls)
-- =============================================
CREATE OR REPLACE FUNCTION public.rpc_subscribe_telegram(p_chat_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.telegram_subscriptions (chat_id, user_id)
  VALUES (p_chat_id, p_user_id)
  ON CONFLICT (chat_id)
  DO UPDATE SET
    user_id = p_user_id,
    created_at = NOW();
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_subscribe_telegram(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpc_get_portfolio_my()
RETURNS SETOF public.portfolios
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.portfolios WHERE owner = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.rpc_get_portfolio_my() TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_upsert_portfolio_my(p_positions jsonb, p_meta jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_portfolio_id uuid;
  v_market text := p_meta->>'market';
BEGIN
  INSERT INTO public.portfolios (owner, positions, meta, updated_at)
  VALUES (auth.uid(), p_positions, p_meta, now())
  ON CONFLICT (owner, (meta->>'market')) DO UPDATE SET
    positions = EXCLUDED.positions,
    meta = EXCLUDED.meta,
    updated_at = now()
  RETURNING id INTO v_portfolio_id;
  RETURN v_portfolio_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_portfolio_my(jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_all_briefings()
RETURNS SETOF public.intelligence_briefings
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT * FROM public.intelligence_briefings ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_all_briefings() TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_briefing(p_title text, p_content text, p_related_tickers text, p_source_url text)
RETURNS SETOF public.intelligence_briefings
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.intelligence_briefings (title, content, related_tickers, source_url)
  VALUES (p_title, p_content, p_related_tickers, p_source_url)
  RETURNING *;
END;
$$;
GRANT EXECUTE ON FUNCTION public.insert_briefing(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_user_watchlist(p_market text)
RETURNS SETOF public.user_watchlist
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.user_watchlist WHERE owner = auth.uid() AND market = p_market;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_get_user_watchlist(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_upsert_user_watchlist(p_market text, p_items jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_watchlist (owner, market, items, updated_at)
  VALUES (auth.uid(), p_market, p_items, now())
  ON CONFLICT (owner, market) DO UPDATE SET
    items = p_items,
    updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_user_watchlist(text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_value_pivot_history(p_market text)
RETURNS SETOF public.user_value_pivot_history
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.user_value_pivot_history WHERE owner = auth.uid() AND market = p_market;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_get_value_pivot_history(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_upsert_value_pivot_history(p_market text, p_results jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_value_pivot_history (owner, market, results, updated_at)
  VALUES (auth.uid(), p_market, p_results, now())
  ON CONFLICT (owner, market) DO UPDATE SET
    results = p_results,
    updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_value_pivot_history(text, jsonb) TO authenticated;

-- [NEW] RPC for Alpha Core quant data
CREATE OR REPLACE FUNCTION public.rpc_get_daily_quant_metrics(p_market text)
RETURNS SETOF public.daily_quant_metrics
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM public.daily_quant_metrics
  WHERE date = (SELECT MAX(date) FROM public.daily_quant_metrics WHERE market = p_market)
  AND market = p_market;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_get_daily_quant_metrics(text) TO authenticated;

-- [NEW] RPC to populate mock quant data for Alpha Core
CREATE OR REPLACE FUNCTION public.rpc_populate_mock_quant_data(p_market text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date date := current_date;
    mock_stocks jsonb;
BEGIN
    -- Clear any existing data for today to ensure idempotency for the day
    DELETE FROM public.daily_quant_metrics WHERE date = today_date AND market = p_market;

    IF p_market = 'KR' THEN
        mock_stocks := '[
            {"ticker": "005930.KS", "name": "삼성전자"},
            {"ticker": "000660.KS", "name": "SK하이닉스"},
            {"ticker": "042700.KQ", "name": "한미반도체"}
        ]';
    ELSE
        mock_stocks := '[
            {"ticker": "NVDA", "name": "NVIDIA Corp"},
            {"ticker": "MSFT", "name": "Microsoft Corp"},
            {"ticker": "TSLA", "name": "Tesla Inc"}
        ]';
    END IF;

    INSERT INTO public.daily_quant_metrics (date, market, ticker, stock_name, metrics, gi, mda, risk)
    SELECT
        today_date,
        p_market,
        s.ticker,
        s.name,
        jsonb_build_object(
            'mom_12m_ex1m', (random() * 0.5 + 0.1),
            'f_inst_5d_rank', (floor(random() * 50 + 50)),
            'vol_squeeze_ratio', (random() * -0.4),
            'quality_flag', (random() > 0.2),
            'efficiency_flag', (random() > 0.3),
            'cc_bonus', (CASE WHEN random() > 0.8 THEN 5 ELSE 0 END)
        ),
        jsonb_build_object(
            'O', (floor(random()*5+5)), 'C', (floor(random()*5+5)), 'P', (floor(random()*5+5)), 'S', (floor(random()*5+5)),
            'A', (floor(random()*5)), 'B', (floor(random()*5)), 'gi_norm', (random()*0.4 + 0.6)
        ),
        jsonb_build_object(
            'weights', jsonb_build_object('M', 0.3, 'F', 0.25, 'V', 0.2, 'Q', 0.15, 'E', 0.1)
        ),
        jsonb_build_object(
            'halted', false,
            'manipulation_flag', false
        )
    FROM jsonb_to_recordset(mock_stocks) AS s(ticker text, name text);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_populate_mock_quant_data(text) TO authenticated;


-- [NEW & FIXED] RPC for Brainwave Monitor
CREATE OR REPLACE FUNCTION public.rpc_get_brainwave_events(p_limit int default 30)
RETURNS TABLE("timestamp" timestamptz, type text, message text, meta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  (
    SELECT
      created_at as "timestamp",
      'collector' as type,
      '새로운 시장 데이터 수집됨' as message,
      jsonb_build_object('source', channel, 'content', left(message, 100)) as meta
    FROM public.telegram_messages
    WHERE created_at >= now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      detected_at as "timestamp",
      'signal' as type,
      source || ' 스캐너가 신호를 포착했습니다.' as message,
      jsonb_build_object('ticker', ticker, 'stockName', stock_name, 'rationale', rationale) as meta
    FROM public.realtime_signals
    WHERE detected_at >= now() - interval '24 hours'
    ORDER BY detected_at DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      created_at as "timestamp",
      'adaptation' as type,
      'AI 자가 학습 사이클이 완료되었습니다.' as message,
      summary as meta
    FROM public.adaptation_log
    WHERE created_at >= now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 10
  )
  ORDER BY "timestamp" DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_get_brainwave_events(int) TO authenticated;


-- =======================================================================================
-- END OF SQL SCRIPT - COPY EVERYTHING UP TO THIS LINE
-- =======================================================================================


---

### **1단계: 프론트엔드 실행 - 웹 애플리케이션 (React/Vite)**
1.  **터미널**을 열고 `copy-of-sepa-ai` 폴더로 이동합니다.
2.  `npm install` (최초 1회)
3.  `copy-of-sepa-ai/config.ts` 파일의 `SUPABASE_URL`과 `SUPABASE_ANON_KEY`를 당신의 프로젝트 정보로 수정합니다. **'알파-링크' 시스템을 활성화하려면 `USE_REALTIME_ALPHA` 플래그를 `true`로 설정하세요.**
4.  `npm start`

---

### **2단계: 백엔드 실행 - 한국 시장 데이터 프록시 (Node.js)**
1.  **별도의 터미널**을 열고 `kis-proxy` 폴더로 이동합니다.
2.  `npm install` (최초 1회)
3.  `.env` 파일의 `KIS_APP_KEY`, `KIS_APP_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 당신의 정보로 수정합니다.
    - **중요:** 프록시는 백엔드 서비스이므로, `anon` 키가 아닌 `service_role` 키를 사용해야 합니다. 이 키는 Supabase 대시보드의 **Project Settings > API > Project API Keys** 에서 찾을 수 있습니다.
4.  `npm start`

---
### **3단계: 운영 및 모니터링 (SQL)**
자율 시스템의 작동을 확인하고 수동으로 제어하려면 Supabase **SQL Editor**에서 아래 쿼리들을 사용하세요.

#### 1. Adaptation Cycle 수동 실행
`adaptation-run` 함수의 주기(10분)를 기다리지 않고 즉시 피드백 루프를 실행합니다.
```sql
select public.fn_run_adaptation_cycle() as run_summary;
```

#### 2. Adaptation Log 확인
가장 최근에 실행된 Adaptation Cycle의 요약 로그를 확인합니다.
```sql
select id, created_at as occurred_at, summary from public.adaptation_log order by created_at desc limit 5;
```

#### 3. 운영 신호 확인
Adaptation Cycle이 생성한 운영용 신호(텔레메트리)를 확인합니다.
```sql
select id, event_type, delivery_status, created_at from public.system_signal_outbox where event_type ilike 'adaptation%' order by created_at desc limit 10;
```