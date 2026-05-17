-- Optional: run in Supabase SQL Editor to block reaction XP at database level

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_match_id uuid,
  p_amount integer,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_reason = 'reaction' THEN
    RETURN;
  END IF;

  INSERT INTO xp_ledger (user_id, match_id, xp_amount, reason)
  VALUES (p_user_id, p_match_id, p_amount, p_reason);

  UPDATE users
  SET total_xp = COALESCE(total_xp, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;
