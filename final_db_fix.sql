-- [CRITICAL FIX] Add missing columns that are causing 400 Errors

-- 1. Fix user_analysis_history (Missing 'analysis_result' column)
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS analysis_result JSONB;
-- Also ensure other potential missing columns from payload exist (optional but safe)
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS stock_name TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS ticker TEXT;

-- 2. Fix user_intelligence_briefings (Missing 'ai_analysis' column)
ALTER TABLE user_intelligence_briefings ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- 3. Relax constraints just in case
ALTER TABLE user_analysis_history ALTER COLUMN analysis_result DROP NOT NULL;
ALTER TABLE user_intelligence_briefings ALTER COLUMN ai_analysis DROP NOT NULL;

-- 4. Ensure ID defaults (common issue)
ALTER TABLE user_analysis_history ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload config';
