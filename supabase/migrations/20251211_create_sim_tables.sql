-- Create table for simulation results
CREATE TABLE IF NOT EXISTS public.sim_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('T', 'M', 'X')), -- Technical, Multi, Self-Improving
    asset TEXT NOT NULL, -- 'KOSPI', 'QQQ', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    final_return NUMERIC, -- Percentage
    mdd NUMERIC, -- Maximum Drawdown Percentage
    win_rate NUMERIC,
    config JSONB, -- Stores specific rules/parameters used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for simulation trade logs
CREATE TABLE IF NOT EXISTS public.sim_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sim_id UUID REFERENCES public.sim_results(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    action TEXT CHECK (action IN ('BUY', 'SELL', 'HOLD', 'NONE')),
    price NUMERIC,
    reason TEXT, -- The "Blind" reasoning
    profit_loss NUMERIC, -- For closed trades
    is_win BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Optional, but good practice)
ALTER TABLE public.sim_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all access for now (Development)
CREATE POLICY "Allow all access to sim_results" ON public.sim_results FOR ALL USING (true);
CREATE POLICY "Allow all access to sim_logs" ON public.sim_logs FOR ALL USING (true);
