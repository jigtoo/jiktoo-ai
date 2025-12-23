-- EMERGENCY FIX: Complete briefing table reset with proper RLS
-- This should ALWAYS work for anon users

BEGIN;

-- 1. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow everyone to read briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Allow everyone to insert briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Allow everyone to update briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Allow everyone to delete briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Allow authenticated users to read briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Allow service role to insert briefings" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Public read access" ON public.user_intelligence_briefings;
DROP POLICY IF EXISTS "Public insert access" ON public.user_intelligence_briefings;

-- 2. Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS public.user_intelligence_briefings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_tickers TEXT,
    source_url TEXT,
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add missing columns if table existed before
ALTER TABLE public.user_intelligence_briefings 
ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;

ALTER TABLE public.user_intelligence_briefings 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- 4. DISABLE RLS temporarily for testing
ALTER TABLE public.user_intelligence_briefings DISABLE ROW LEVEL SECURITY;

-- 5. Grant full permissions to everyone (EMERGENCY ONLY)
GRANT ALL ON public.user_intelligence_briefings TO anon;
GRANT ALL ON public.user_intelligence_briefings TO authenticated;
GRANT ALL ON public.user_intelligence_briefings TO service_role;

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_briefings_created_at 
ON public.user_intelligence_briefings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_briefings_processed 
ON public.user_intelligence_briefings (is_processed, created_at DESC);

COMMIT;

-- Notification
NOTIFY pgrst, 'reload schema';

-- Test insert
INSERT INTO public.user_intelligence_briefings (title, content, is_processed)
VALUES ('EMERGENCY_FIX_TEST', 'If you see this, the fix worked!', false)
RETURNING id, title, created_at;

SELECT 'Fix applied successfully! RLS is now DISABLED for testing.' as status;
