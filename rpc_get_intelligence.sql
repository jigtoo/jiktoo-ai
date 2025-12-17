-- RPC to get recent telegram messages (Bypassing RLS for Anon)
CREATE OR REPLACE FUNCTION get_recent_intelligence()
RETURNS TABLE (
  id uuid,
  channel text,
  message text,  -- Mapping 'text' column to 'message' if needed, or just select *
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Owner (Bypasses RLS)
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.channel_name as channel, t.message_text as message, t.created_at
  FROM telegram_messages t
  ORDER BY t.created_at DESC
  LIMIT 20;
END;
$$;
