-- ============================================
-- MEGATREND ANALYSIS PERSISTENCE SCHEMA
-- ============================================
-- Purpose: Store megatrend analysis results permanently
-- so they persist across app restarts and enable
-- monthly automatic re-analysis.
-- ============================================

-- 1. Megatrend Analysis Table
CREATE TABLE IF NOT EXISTS megatrend_analysis (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_factors TEXT[] NOT NULL,
    time_horizon TEXT NOT NULL,
    impact_score INTEGER NOT NULL,
    risks TEXT[] DEFAULT '{}',
    investment_opportunities TEXT[] DEFAULT '{}',
    sources TEXT[] DEFAULT '{}',
    market_target TEXT NOT NULL CHECK (market_target IN ('KR', 'US')),
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval by market and date
CREATE INDEX IF NOT EXISTS idx_megatrend_market_date 
ON megatrend_analysis(market_target, analyzed_at DESC);

-- 2. Investment Themes Table
CREATE TABLE IF NOT EXISTS investment_themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    megatrend_id TEXT NOT NULL,
    description TEXT NOT NULL,
    sub_themes TEXT[] NOT NULL,
    target_markets TEXT[] NOT NULL,
    expected_growth_rate TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval by megatrend
CREATE INDEX IF NOT EXISTS idx_themes_megatrend 
ON investment_themes(megatrend_id);

-- 3. Theme Stocks Table
CREATE TABLE IF NOT EXISTS theme_stocks (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    theme_name TEXT NOT NULL,
    rationale TEXT NOT NULL,
    market_cap TEXT,
    revenue_exposure TEXT,
    ai_confidence INTEGER NOT NULL,
    catalysts TEXT[] NOT NULL,
    risks TEXT[] NOT NULL,
    market_target TEXT NOT NULL CHECK (market_target IN ('KR', 'US')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval by theme and ticker
CREATE INDEX IF NOT EXISTS idx_theme_stocks_theme 
ON theme_stocks(theme_id);

CREATE INDEX IF NOT EXISTS idx_theme_stocks_ticker 
ON theme_stocks(ticker);

-- 4. Long-term Portfolios Table
CREATE TABLE IF NOT EXISTS long_term_portfolios (
    id TEXT PRIMARY KEY,
    megatrend_id TEXT NOT NULL,
    portfolio_name TEXT NOT NULL,
    risk_profile TEXT NOT NULL CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
    total_allocation INTEGER NOT NULL DEFAULT 100,
    positions JSONB NOT NULL,
    rebalance_frequency TEXT NOT NULL,
    expected_return TEXT NOT NULL,
    max_drawdown TEXT NOT NULL,
    investment_thesis TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval by megatrend and risk profile
CREATE INDEX IF NOT EXISTS idx_portfolios_megatrend 
ON long_term_portfolios(megatrend_id);

-- 5. Megatrend Analysis History (for tracking monthly re-analysis)
CREATE TABLE IF NOT EXISTS megatrend_analysis_history (
    id SERIAL PRIMARY KEY,
    analysis_date DATE NOT NULL,
    market_target TEXT NOT NULL CHECK (market_target IN ('KR', 'US')),
    trends_discovered INTEGER NOT NULL,
    themes_generated INTEGER NOT NULL,
    stocks_found INTEGER NOT NULL,
    execution_time_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval by date
CREATE INDEX IF NOT EXISTS idx_history_date 
ON megatrend_analysis_history(analysis_date DESC);

-- ============================================
-- CLEANUP FUNCTION (Optional)
-- ============================================
-- Function to delete old analysis data (older than 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_megatrend_data()
RETURNS void AS $$
BEGIN
    DELETE FROM megatrend_analysis
    WHERE analyzed_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;
