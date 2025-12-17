-- Fix alpha_engine_playbooks ID (Auto-generate UUID)
ALTER TABLE alpha_engine_playbooks 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix strategies table (Ensure US/KR strategies exist to prevent PGRST116)
INSERT INTO strategies (name, market, is_active, min_score, allocation)
VALUES 
('GENOME_MOMENTUM', 'US', true, 80, 0.5),
('GENOME_MOMENTUM', 'KR', true, 80, 0.5)
ON CONFLICT (name, market) DO NOTHING;
