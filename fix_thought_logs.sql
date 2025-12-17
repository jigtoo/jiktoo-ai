-- Check and Fix ai_thought_logs table
CREATE TABLE IF NOT EXISTS public.ai_thought_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ticker TEXT,
    action TEXT, -- 'SCAN', 'ANALYSIS', 'DECISION', 'EXECUTION'
    confidence NUMERIC,
    message TEXT,
    details JSONB,
    strategy TEXT
);

-- Enable RLS
ALTER TABLE public.ai_thought_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_thought_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.ai_thought_logs;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.ai_thought_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.ai_thought_logs FOR INSERT WITH CHECK (true);

-- Insert a test log to confirm connectivity
INSERT INTO public.ai_thought_logs (action, message, confidence, strategy, details)
VALUES (
    'ANALYSIS',
    '[System] AI Thought Stream Connected. Monitoring started.',
    100,
    'SYSTEM_INIT',
    '{"status": "online"}'
);
