-- Fix strategies table schema for Strategy Lab 2.0
-- This script adds missing columns and fixes constraints causing save failures

-- 1. Add logic_v2 if missing
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS logic_v2 JSONB;

COMMENT ON COLUMN strategies.logic_v2 IS 'Stores the V2 logic tree structure for Strategy Lab 2.0';

-- 2. Add owner_id if missing
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN strategies.owner_id IS 'References the user who created this strategy';

-- 3. Fix "genome" column constraint (Legacy/Evolution feature)
-- It might be NOT NULL, which breaks V2 logic saving. Make it nullable.
ALTER TABLE strategies 
ALTER COLUMN genome DROP NOT NULL;

-- 4. Ensure market column exists
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS market TEXT DEFAULT 'KR';

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
