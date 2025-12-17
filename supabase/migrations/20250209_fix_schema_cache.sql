-- Fix: Refresh Supabase schema cache for alpha_engine_playbooks
-- This script forces Supabase to reload the table schema, fixing PGRST204 errors

-- Option 1: Simple NOTIFY to refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Option 2: If that doesn't work, recreate the table (preserves data)
-- First, verify the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'alpha_engine_playbooks' 
        AND column_name = 'ai_confidence'
    ) THEN
        -- Add the missing column if it doesn't exist
        ALTER TABLE public.alpha_engine_playbooks 
        ADD COLUMN ai_confidence NUMERIC;
        
        RAISE NOTICE 'Added missing ai_confidence column';
    ELSE
        RAISE NOTICE 'ai_confidence column already exists';
    END IF;
END $$;

-- Verify all required columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'alpha_engine_playbooks'
ORDER BY ordinal_position;
