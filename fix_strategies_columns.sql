-- Add missing columns to strategies
ALTER TABLE public.strategies 
ADD COLUMN IF NOT EXISTS min_score NUMERIC DEFAULT 80,
ADD COLUMN IF NOT EXISTS allocation NUMERIC DEFAULT 0.5;

-- Then insert the defaults
INSERT INTO strategies (name, market, is_active, min_score, allocation, genome)
VALUES 
('GENOME_MOMENTUM', 'US', true, 80, 0.5, '{}'),
('GENOME_MOMENTUM', 'KR', true, 80, 0.5, '{}')
ON CONFLICT DO NOTHING;
