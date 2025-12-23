
-- Create a table to store AI Quant Screener results for persistence
CREATE TABLE IF NOT EXISTS public.ai_quant_screener_results (
    id TEXT PRIMARY KEY, -- Composite key: market_target + ticker + strategy_type
    market_target TEXT NOT NULL,
    ticker TEXT NOT NULL,
    stock_name TEXT,
    price TEXT, -- Store as text to handle formatting
    rationale TEXT, -- The strategy name or reason
    ai_score INTEGER,
    technical_signal TEXT,
    strategy_type TEXT NOT NULL, -- 'value', 'power', 'turnaround', 'genome', 'hof'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policy
ALTER TABLE public.ai_quant_screener_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.ai_quant_screener_results
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE public.ai_quant_screener_results TO authenticated;
GRANT ALL ON TABLE public.ai_quant_screener_results TO service_role;
GRANT ALL ON TABLE public.ai_quant_screener_results TO anon;
