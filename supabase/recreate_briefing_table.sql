-- FINAL ATTEMPT: Drop and Recreate Table
-- Attempts to fix persistent 'Column not found' schema cache errors by creating a fresh table.
-- WARNING: This will delete existing briefing data (if any).

-- 1. Drop the table completely
DROP TABLE IF EXISTS public.user_intelligence_briefings CASCADE;

-- 2. Recreate the table with simple, lowercase column names
CREATE TABLE public.user_intelligence_briefings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_tickers TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.user_intelligence_briefings ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply Permissions (Policies)
CREATE POLICY "Allow everyone to read briefings"
ON public.user_intelligence_briefings FOR SELECT
TO authenticated, anon, service_role USING (true);

CREATE POLICY "Allow everyone to insert briefings"
ON public.user_intelligence_briefings FOR INSERT
TO authenticated, anon, service_role WITH CHECK (true);

CREATE POLICY "Allow everyone to update briefings"
ON public.user_intelligence_briefings FOR UPDATE
TO authenticated, anon, service_role USING (true);

CREATE POLICY "Allow everyone to delete briefings"
ON public.user_intelligence_briefings FOR DELETE
TO authenticated, anon, service_role USING (true);

-- 5. Final Notification to API
NOTIFY pgrst, 'reload schema';
