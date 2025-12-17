-- ========================================
-- AI Token Usage Tracking Table
-- Tracks Gemini API token usage and costs
-- ========================================

-- Create the ai_token_usage table
CREATE TABLE IF NOT EXISTS public.ai_token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Create Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_token_usage' AND policyname = 'Allow authenticated users to read token usage') THEN
        CREATE POLICY "Allow authenticated users to read token usage" 
        ON public.ai_token_usage 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_token_usage' AND policyname = 'Allow service role to manage token usage') THEN
        CREATE POLICY "Allow service role to manage token usage" 
        ON public.ai_token_usage 
        FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- Create Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON public.ai_token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON public.ai_token_usage(model);
CREATE INDEX IF NOT EXISTS idx_token_usage_cost ON public.ai_token_usage(cost_usd DESC);

-- Add comment for documentation
COMMENT ON TABLE public.ai_token_usage IS 'Tracks Gemini API token usage and associated costs for monitoring and budgeting';
COMMENT ON COLUMN public.ai_token_usage.model IS 'Gemini model used (e.g., gemini-1.5-flash, gemini-1.5-pro)';
COMMENT ON COLUMN public.ai_token_usage.input_tokens IS 'Number of input tokens (prompt)';
COMMENT ON COLUMN public.ai_token_usage.output_tokens IS 'Number of output tokens (response)';
COMMENT ON COLUMN public.ai_token_usage.cost_usd IS 'Calculated cost in USD based on model pricing';
