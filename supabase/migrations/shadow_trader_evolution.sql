-- Phase 5: Autonomous Evolution System - Database Schema
-- Shadow Trader 매매 기록 및 성과 추적 테이블

-- 1. Shadow Trader 매매 기록 테이블
CREATE TABLE IF NOT EXISTS shadow_trader_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 종목 정보
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    
    -- 매매 정보
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL CHECK (price > 0),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    
    -- AI 판단 근거
    reason TEXT,
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    
    -- Trigger 정보
    trigger_type TEXT CHECK (trigger_type IN ('VOLUME_SPIKE', 'VOLATILITY_BREAKOUT', 'AI_SIGNAL', 'TAKE_PROFIT', 'STOP_LOSS')),
    trigger_score INTEGER CHECK (trigger_score >= 0 AND trigger_score <= 100),
    
    -- 시장 환경
    market_regime TEXT,
    market_regime_score NUMERIC,
    
    -- 성과 추적 (매도 시점에 업데이트)
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', 'BREAKEVEN')),
    profit_loss NUMERIC DEFAULT 0,
    profit_loss_rate NUMERIC DEFAULT 0,
    holding_days INTEGER DEFAULT 0,
    
    -- 거래 쌍 추적 (매수-매도 연결)
    trade_pair_id UUID,
    related_buy_id UUID REFERENCES shadow_trader_trades(id),
    related_sell_id UUID REFERENCES shadow_trader_trades(id),
    
    -- 컨텍스트 (JSON으로 유연하게 저장)
    context JSONB DEFAULT '{}'::jsonb,
    
    -- 인덱스용
    market_target TEXT DEFAULT 'KR'
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_shadow_trades_ticker ON shadow_trader_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_action ON shadow_trader_trades(action);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_created_at ON shadow_trader_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_outcome ON shadow_trader_trades(outcome);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_trigger_type ON shadow_trader_trades(trigger_type);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_trade_pair_id ON shadow_trader_trades(trade_pair_id);

-- 2. AI 학습 로그 테이블 (전략 최적화 기록)
CREATE TABLE IF NOT EXISTS ai_strategy_optimization_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 최적화 대상
    optimization_target TEXT NOT NULL, -- 'SNIPER_TRIGGER', 'POSITION_SIZE', 'TAKE_PROFIT', 'STOP_LOSS'
    
    -- 이전 파라미터
    previous_params JSONB NOT NULL,
    
    -- 새로운 파라미터
    new_params JSONB NOT NULL,
    
    -- 최적화 근거
    reasoning TEXT,
    performance_improvement NUMERIC,
    
    -- 분석 데이터
    analyzed_trades INTEGER,
    win_rate_before NUMERIC,
    win_rate_after NUMERIC,
    
    -- 승인 상태
    status TEXT DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'ACTIVE')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_strategy_opt_target ON ai_strategy_optimization_log(optimization_target);
CREATE INDEX IF NOT EXISTS idx_strategy_opt_status ON ai_strategy_optimization_log(status);
CREATE INDEX IF NOT EXISTS idx_strategy_opt_created_at ON ai_strategy_optimization_log(created_at DESC);

-- 3. 성과 통계 뷰 (자주 사용하는 쿼리를 미리 정의)
CREATE OR REPLACE VIEW shadow_trader_performance_stats AS
SELECT 
    -- 전체 통계
    COUNT(*) FILTER (WHERE action = 'BUY') as total_buys,
    COUNT(*) FILTER (WHERE action = 'SELL') as total_sells,
    COUNT(*) FILTER (WHERE outcome = 'WIN') as wins,
    COUNT(*) FILTER (WHERE outcome = 'LOSS') as losses,
    
    -- 승률
    ROUND(
        COUNT(*) FILTER (WHERE outcome = 'WIN')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE action = 'SELL'), 0) * 100, 
        2
    ) as win_rate,
    
    -- 수익률
    SUM(profit_loss) as total_profit_loss,
    AVG(profit_loss) FILTER (WHERE action = 'SELL') as avg_profit_loss,
    AVG(profit_loss_rate) FILTER (WHERE action = 'SELL') as avg_profit_loss_rate,
    
    -- 평균 보유 기간
    AVG(holding_days) FILTER (WHERE action = 'SELL') as avg_holding_days,
    
    -- 최고/최악 거래
    MAX(profit_loss) as best_trade,
    MIN(profit_loss) as worst_trade
FROM shadow_trader_trades
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 4. Trigger 타입별 성과 뷰
CREATE OR REPLACE VIEW trigger_type_performance AS
SELECT 
    trigger_type,
    COUNT(*) FILTER (WHERE action = 'SELL') as total_trades,
    COUNT(*) FILTER (WHERE outcome = 'WIN') as wins,
    COUNT(*) FILTER (WHERE outcome = 'LOSS') as losses,
    ROUND(
        COUNT(*) FILTER (WHERE outcome = 'WIN')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE action = 'SELL'), 0) * 100, 
        2
    ) as win_rate,
    AVG(profit_loss_rate) FILTER (WHERE action = 'SELL') as avg_return,
    AVG(holding_days) FILTER (WHERE action = 'SELL') as avg_holding_days
FROM shadow_trader_trades
WHERE trigger_type IS NOT NULL
GROUP BY trigger_type
ORDER BY win_rate DESC;

-- 5. 시장 국면별 성과 뷰
CREATE OR REPLACE VIEW market_regime_performance AS
SELECT 
    market_regime,
    COUNT(*) FILTER (WHERE action = 'SELL') as total_trades,
    ROUND(
        COUNT(*) FILTER (WHERE outcome = 'WIN')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE action = 'SELL'), 0) * 100, 
        2
    ) as win_rate,
    AVG(profit_loss_rate) FILTER (WHERE action = 'SELL') as avg_return
FROM shadow_trader_trades
WHERE market_regime IS NOT NULL
GROUP BY market_regime
ORDER BY win_rate DESC;

-- RLS (Row Level Security) 정책
ALTER TABLE shadow_trader_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_strategy_optimization_log ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (서비스 키로 쓰기)
CREATE POLICY "Allow read access to all users" ON shadow_trader_trades
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to all users" ON ai_strategy_optimization_log
    FOR SELECT USING (true);

-- 서비스 역할만 쓰기 가능
CREATE POLICY "Allow insert for service role" ON shadow_trader_trades
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for service role" ON shadow_trader_trades
    FOR UPDATE USING (true);

CREATE POLICY "Allow insert for service role" ON ai_strategy_optimization_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for service role" ON ai_strategy_optimization_log
    FOR UPDATE USING (true);

-- 완료!
-- 이제 VirtualTradingService에서 매매 시 Supabase에 기록하면 됩니다.
