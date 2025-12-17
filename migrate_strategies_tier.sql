-- Add 'tier' column to strategies table if it doesn't exist
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'B';

-- Update existing rows to have a default tier if null (though DEFAULT handles new rows)
UPDATE public.strategies SET tier = 'B' WHERE tier IS NULL;

-- Create index for tier
CREATE INDEX IF NOT EXISTS idx_strategies_tier ON public.strategies(tier);
