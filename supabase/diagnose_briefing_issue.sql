-- EMERGENCY DIAGNOSIS: Why is briefing submission hanging?
-- Run this in Supabase SQL Editor to check table status

-- 1. Check if table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_intelligence_briefings'
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'user_intelligence_briefings';

-- 3. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_intelligence_briefings';

-- 4. Check for any triggers that might be blocking
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'user_intelligence_briefings';

-- 5. Test if we can actually insert (this will fail if RLS blocks it)
-- IMPORTANT: Run this as anon role simulation
INSERT INTO public.user_intelligence_briefings (title, content, is_processed)
VALUES ('TEST_DIAGNOSIS', 'Testing if insert works', false)
RETURNING *;

-- If above fails, check what role you're using
SELECT current_user, current_role;
