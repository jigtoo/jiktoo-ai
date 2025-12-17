-- Fix trading_playbooks table schema
-- The table was missing the 'columns' parameter issue

-- Drop existing table if it has issues
DROP TABLE IF EXISTS public.trading_playbooks CASCADE;

-- Recreate with proper structure
CREATE TABLE public.trading_playbooks (
    market TEXT PRIMARY KEY,
    stories JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trading_playbooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read access" ON public.trading_playbooks;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
    ON public.trading_playbooks 
    FOR SELECT 
    USING (true);

-- Create policy for insert/update (service role only)
DROP POLICY IF EXISTS "Allow service role write" ON public.trading_playbooks;
CREATE POLICY "Allow service role write"
    ON public.trading_playbooks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.trading_playbooks TO anon, authenticated;
GRANT ALL ON public.trading_playbooks TO service_role;
