-- Run in Supabase SQL Editor before using 10 team votes per user/match.
-- Keeps the existing one-row-per-user-per-match vote model and stores the count on that row.

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS vote_count integer NOT NULL DEFAULT 1;

UPDATE public.votes
SET vote_count = 1
WHERE vote_count IS NULL OR vote_count < 1;

ALTER TABLE public.votes
  DROP CONSTRAINT IF EXISTS votes_vote_count_range;

ALTER TABLE public.votes
  ADD CONSTRAINT votes_vote_count_range CHECK (vote_count BETWEEN 1 AND 10);

-- Existing payout remains one XP award per winning user, not per vote tap.
CREATE OR REPLACE FUNCTION public.payout_match(p_match_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner text;
  v_votes_paid integer := 0;
  v_preds_paid integer := 0;
  v_q_paid integer;
  r_vote record;
  r_q record;
BEGIN
  SELECT winner_team INTO v_winner
  FROM matches
  WHERE id = p_match_id;

  IF v_winner IS NULL THEN
    RAISE EXCEPTION 'Set match winner before running payout';
  END IF;

  FOR r_vote IN
    SELECT id, user_id
    FROM votes
    WHERE match_id = p_match_id
      AND team_picked = v_winner
      AND xp_awarded = false
  LOOP
    PERFORM award_xp(r_vote.user_id, p_match_id, 100, 'correct_vote');
    UPDATE votes SET xp_awarded = true WHERE id = r_vote.id;
    v_votes_paid := v_votes_paid + 1;
  END LOOP;

  FOR r_q IN
    SELECT id FROM prediction_questions
    WHERE match_id = p_match_id
      AND correct_answer IS NOT NULL
      AND btrim(correct_answer) <> ''
  LOOP
    v_q_paid := pay_question_predictions(r_q.id);
    v_preds_paid := v_preds_paid + v_q_paid;
  END LOOP;

  RETURN json_build_object(
    'votes_paid', v_votes_paid,
    'predictions_paid', v_preds_paid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.payout_match(uuid) TO anon, authenticated;
