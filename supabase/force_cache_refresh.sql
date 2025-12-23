-- NUCLEAR OPTION: Force Schema Cache Refresh
-- Sometimes NOTIFY is ignored. This script modifies the table structure to force a cache rebuild.

-- 1. Add a dummy column
ALTER TABLE public.user_intelligence_briefings ADD COLUMN IF NOT EXISTS _cache_buster text;

-- 2. Notify the API to reload
NOTIFY pgrst, 'reload schema';

-- 3. Drop the dummy column (Cleanup)
ALTER TABLE public.user_intelligence_briefings DROP COLUMN IF EXISTS _cache_buster;

-- 4. Notify again just in case
NOTIFY pgrst, 'reload schema';
