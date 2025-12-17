-- Add missing columns to telegram_messages to match Collector
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS channel_id text;
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS message_id bigint;
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS sender_id bigint;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_telegram_messages_date ON telegram_messages(date DESC);
