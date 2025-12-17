-- Add status and plan columns to alpha_engine_playbooks
ALTER TABLE public.alpha_engine_playbooks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'WATCHING', -- 'WATCHING', 'BOUGHT', 'DISCARDED'
ADD COLUMN IF NOT EXISTS entry_plan JSONB, -- { "trigger_price": 1000, "condition": "MA20_TOUCH" }
ADD COLUMN IF NOT EXISTS scan_type TEXT, -- 'QUANT', 'NEWS', 'MANUAL'
ADD COLUMN IF NOT EXISTS pattern_name TEXT,
ADD COLUMN IF NOT EXISTS avg_gain NUMERIC,
ADD COLUMN IF NOT EXISTS success_rate NUMERIC,
ADD COLUMN IF NOT EXISTS example_chart TEXT,
ADD COLUMN IF NOT EXISTS key_factors JSONB,
ADD COLUMN IF NOT EXISTS is_candidate BOOLEAN DEFAULT TRUE;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_playbooks_status_market 
ON public.alpha_engine_playbooks(status, market);
