-- FIX_ZERO_BALANCE_RLS.sql
-- Shadow Trader Dashboard가 0원으로 표시되는 문제를 해결하기 위해
-- 필수 테이블들의 Row Level Security(RLS)를 해제하거나 권한을 부여합니다.

-- 1. portfolios (백엔드 원장)
ALTER TABLE public.portfolios DISABLE ROW LEVEL SECURITY;

-- 2. ai_trader_portfolios (프론트엔드 표시용)
ALTER TABLE public.ai_trader_portfolios DISABLE ROW LEVEL SECURITY;

-- 3. user_analysis_history (사용자 분석 기록)
ALTER TABLE public.user_analysis_history DISABLE ROW LEVEL SECURITY;

-- 4. ai_trade_journals (매매 일지)
ALTER TABLE public.ai_trade_journals DISABLE ROW LEVEL SECURITY;

-- 5. telegram_messages (텔레그램 인텔리전스)
ALTER TABLE public.telegram_messages DISABLE ROW LEVEL SECURITY;

-- 권한 확인 로직 (Optional: public에 대한 권한 명시적 부여)
GRANT ALL ON TABLE public.portfolios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_trader_portfolios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_analysis_history TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_trade_journals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.telegram_messages TO anon, authenticated, service_role;

-- 완료 확인
SELECT 'RLS Disabled and Permissions Granted for Shadow Trader Tables' as status;
