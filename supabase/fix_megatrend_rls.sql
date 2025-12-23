-- Fix RLS policies for megatrend_analysis to allow client-side inserts
-- UPDATED: Now valid to run multiple times (Idempotent)

-- 1. Drop ALL potential existing policies (both old and new names)
DROP POLICY IF EXISTS "Allow authenticated users to read megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow service role to insert megatrend analysis" ON public.megatrend_analysis;

-- Drop the policies we are about to create to prevent "already exists" errors
DROP POLICY IF EXISTS "Allow everyone to read megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow everyone to insert megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow everyone to update megatrend analysis" ON public.megatrend_analysis;
DROP POLICY IF EXISTS "Allow everyone to delete megatrend analysis" ON public.megatrend_analysis;

-- 2. Allow SELECT for everyone (authenticated & anon)
CREATE POLICY "Allow everyone to read megatrend analysis"
ON public.megatrend_analysis
FOR SELECT
TO authenticated, anon, service_role
USING (true);

-- 3. Allow INSERT for everyone (authenticated & anon)
CREATE POLICY "Allow everyone to insert megatrend analysis"
ON public.megatrend_analysis
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (true);

-- 4. Allow UPDATE for everyone (authenticated & anon)
CREATE POLICY "Allow everyone to update megatrend analysis"
ON public.megatrend_analysis
FOR UPDATE
TO authenticated, anon, service_role
USING (true);

-- 5. Allow DELETE for everyone (authenticated & anon)
CREATE POLICY "Allow everyone to delete megatrend analysis"
ON public.megatrend_analysis
FOR DELETE
TO authenticated, anon, service_role
USING (true);
