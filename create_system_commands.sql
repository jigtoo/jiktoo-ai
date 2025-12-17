-- Create system_commands table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if RLS is enabled on system_commands, if not enable it
ALTER TABLE public.system_commands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (Idempotent)
DROP POLICY IF EXISTS "Allow anon insert system_commands" ON public.system_commands;
DROP POLICY IF EXISTS "Allow anon select system_commands" ON public.system_commands;
DROP POLICY IF EXISTS "Allow anon update system_commands" ON public.system_commands;

-- Create policy to allow all access for now
CREATE POLICY "Allow anon insert system_commands" ON public.system_commands
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select system_commands" ON public.system_commands
    FOR SELECT USING (true);

CREATE POLICY "Allow anon update system_commands" ON public.system_commands
    FOR UPDATE USING (true);

-- Enable Realtime for this table (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_commands') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE system_commands;
    END IF;
END $$;
