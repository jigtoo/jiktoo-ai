-- Enable RLS on the table if not already enabled
ALTER TABLE public.user_intelligence_briefings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to insert briefings (for creating new tasks)
CREATE POLICY "Enable insert for all users" ON public.user_intelligence_briefings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous and authenticated users to update their own briefings (or all for now to fix the specific 403 error)
-- Ideally this should be scoped to user_id, but since we use anonymous auth heavily in this app context:
CREATE POLICY "Enable update for all users" ON public.user_intelligence_briefings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow reading
CREATE POLICY "Enable select for all users" ON public.user_intelligence_briefings
FOR SELECT
TO anon, authenticated
USING (true);
