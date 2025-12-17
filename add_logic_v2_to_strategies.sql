-- Add logic_v2 column to strategies table for Strategy Lab 2.0
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS logic_v2 JSONB;

-- Comment on column
COMMENT ON COLUMN strategies.logic_v2 IS 'Stores the V2 logic tree structure for Strategy Lab 2.0';

-- Force schema cache reload (optional/implicit usually, but good to know)
NOTIFY pgrst, 'reload schema';
