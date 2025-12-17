-- Create Alpha Core Signals Table
CREATE TABLE IF NOT EXISTS public.alpha_core_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    ticker TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    
    -- Signal Details
    signal_type TEXT NOT NULL, -- 'CONVICTION', 'VALUE', 'MOMENTUM', etc.
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale TEXT NOT NULL,
    
    -- Price Targets
    entry_price NUMERIC NOT NULL,
    target_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    risk_reward_ratio NUMERIC NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'ONGOING', NULL)),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alpha_core_date_market ON public.alpha_core_signals(date DESC, market);
CREATE INDEX IF NOT EXISTS idx_alpha_core_ticker ON public.alpha_core_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_alpha_core_confidence ON public.alpha_core_signals(confidence DESC) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.alpha_core_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read alpha core signals"
ON public.alpha_core_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage alpha core signals"
ON public.alpha_core_signals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-update trigger
CREATE TRIGGER update_alpha_core_updated_at
BEFORE UPDATE ON public.alpha_core_signals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.alpha_core_signals IS 'Alpha Core high-conviction signals';
