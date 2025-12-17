-- Migration: Create trading_playbooks table
-- Created: 2025-02-06
-- Description: This table stores AI-generated trading playbooks for the "성공 투자 복기" feature

-- Create trading_playbooks table
CREATE TABLE IF NOT EXISTS public.trading_playbooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
    stories JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.trading_playbooks ENABLE ROW LEVEL SECURITY;

-- Create Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_playbooks' AND policyname = 'Allow authenticated users to read trading playbooks') THEN
        CREATE POLICY "Allow authenticated users to read trading playbooks" ON public.trading_playbooks FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_playbooks' AND policyname = 'Allow service role to manage trading playbooks') THEN
        CREATE POLICY "Allow service role to manage trading playbooks" ON public.trading_playbooks FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trading_playbooks_market ON public.trading_playbooks(market);
CREATE INDEX IF NOT EXISTS idx_trading_playbooks_updated_at ON public.trading_playbooks(updated_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_trading_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_trading_playbooks_updated_at ON public.trading_playbooks;
CREATE TRIGGER trigger_update_trading_playbooks_updated_at
    BEFORE UPDATE ON public.trading_playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_trading_playbooks_updated_at();
