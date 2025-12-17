-- Create collector_health view for app to display real-time collector status

CREATE OR REPLACE VIEW collector_health AS
SELECT 
    MAX(date) as last_ingested_at,
    EXTRACT(EPOCH FROM (NOW() - MAX(date)))/60 as minutes_since_last,
    COUNT(*) as total_messages
FROM telegram_messages;
