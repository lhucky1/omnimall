
-- This view finds the last message for each conversation.
-- It helps efficiently query the most recent message content and timestamp.
-- To apply this, run the entire script in your Supabase SQL Editor.

CREATE OR REPLACE VIEW public.last_message_view AS
SELECT
  DISTINCT ON (conversation_id) conversation_id,
  id,
  content,
  created_at
FROM
  public.messages
ORDER BY
  conversation_id,
  created_at DESC;
