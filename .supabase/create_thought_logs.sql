-- Create table for storing AI thought process logs
CREATE TABLE IF NOT EXISTS public.ai_thought_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ticker TEXT,
    action TEXT, -- 'SCAN', 'ANALYSIS', 'DECISION', 'EXECUTION'
    confidence NUMERIC,
    message TEXT,
    details JSONB, -- Detailed data (indicators, scores, etc.)
    strategy TEXT
);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_ai_thought_logs_created_at ON public.ai_thought_logs(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.ai_thought_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid errors (Fix for "policy already exists" error)
DROP POLICY IF EXISTS "Allow all access to ai_thought_logs" ON public.ai_thought_logs;

-- Create policy to allow all access (for now, simplify for development)
CREATE POLICY "Allow all access to ai_thought_logs" ON public.ai_thought_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Grant access to anon and service_role
GRANT ALL ON public.ai_thought_logs TO anon, authenticated, service_role;
