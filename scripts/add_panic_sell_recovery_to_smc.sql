-- Add panic_sell_recovery column to smc_signals table
-- This stores volume climax and capitulation recovery analysis data

ALTER TABLE smc_signals 
ADD COLUMN IF NOT EXISTS panic_sell_recovery JSONB;

COMMENT ON COLUMN smc_signals.panic_sell_recovery IS 'Panic sell recovery analysis: volume climax and capitulation recovery data';

-- Create index for querying panic sell recovery signals
CREATE INDEX IF NOT EXISTS idx_smc_signals_panic_recovery 
ON smc_signals ((panic_sell_recovery->>'isRecovering')) 
WHERE panic_sell_recovery IS NOT NULL;
