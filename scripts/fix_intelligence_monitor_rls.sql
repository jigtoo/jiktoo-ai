-- Fix RLS policies for Intelligence Flow Monitor tables
-- This ensures the IntelligenceFlowMonitor component can read data

-- Enable RLS on telegram_messages if not already enabled
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to telegram_messages" ON telegram_messages;
DROP POLICY IF EXISTS "Allow authenticated read access to telegram_messages" ON telegram_messages;

-- Create permissive SELECT policy for telegram_messages
CREATE POLICY "Allow public read access to telegram_messages"
ON telegram_messages
FOR SELECT
TO public
USING (true);

-- Enable RLS on ai_thought_logs if not already enabled
ALTER TABLE ai_thought_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to ai_thought_logs" ON ai_thought_logs;
DROP POLICY IF EXISTS "Allow authenticated read access to ai_thought_logs" ON ai_thought_logs;

-- Create permissive SELECT policy for ai_thought_logs
CREATE POLICY "Allow public read access to ai_thought_logs"
ON ai_thought_logs
FOR SELECT
TO public
USING (true);

-- Also allow INSERT for ai_thought_logs (needed by the system)
DROP POLICY IF EXISTS "Allow public insert to ai_thought_logs" ON ai_thought_logs;

CREATE POLICY "Allow public insert to ai_thought_logs"
ON ai_thought_logs
FOR INSERT
TO public
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('telegram_messages', 'ai_thought_logs')
ORDER BY tablename, policyname;
