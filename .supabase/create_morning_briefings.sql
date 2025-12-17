
-- Create table for Morning Briefings
CREATE TABLE IF NOT EXISTS morning_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_target TEXT NOT NULL, -- 'KR' or 'US'
    date TEXT NOT NULL, -- YYYY-MM-DD
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_points JSONB NOT NULL, -- Array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE morning_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON morning_briefings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for service role" ON morning_briefings
    FOR INSERT WITH CHECK (true);
