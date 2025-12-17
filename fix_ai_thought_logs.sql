-- Fix ai_thought_logs table schema: add missing 'market' column
-- This resolves: "Could not find the 'market' column of 'ai_thought_logs' in the schema cache"

-- Add market column if it doesn't exist
ALTER TABLE public.ai_thought_logs 
ADD COLUMN IF NOT EXISTS market TEXT;

-- Add market_target column if it doesn't exist (for compatibility)
ALTER TABLE public.ai_thought_logs 
ADD COLUMN IF NOT EXISTS market_target TEXT;

-- Update RLS policies for ai_thought_logs
DROP POLICY IF EXISTS "Allow anon select ai_thought_logs" ON public.ai_thought_logs;
DROP POLICY IF EXISTS "Allow anon insert ai_thought_logs" ON public.ai_thought_logs;
DROP POLICY IF EXISTS "Allow anon update ai_thought_logs" ON public.ai_thought_logs;

CREATE POLICY "Allow anon select ai_thought_logs" ON public.ai_thought_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon insert ai_thought_logs" ON public.ai_thought_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon update ai_thought_logs" ON public.ai_thought_logs FOR UPDATE TO public USING (true);
