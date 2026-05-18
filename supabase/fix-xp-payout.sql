-- Run this in Supabase Dashboard → SQL Editor (one paste, then Run)
-- Fixes: column "amount" does not exist (table uses xp_amount)
-- Ensures XP only for correct predictions; pays when correct answer is marked

-- ─── award_xp ───────────────────────────────────────────────────────────────
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
  INSERT INTO xp_ledger (user_id, match_id, xp_amount, reason)
  VALUES (p_user_id, p_match_id, p_amount, p_reason);

  UPDATE users
  SET total_xp = COALESCE(total_xp, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- ─── Pay predictions for one question (correct answer must be set) ────────
CREATE OR REPLACE FUNCTION public.pay_question_predictions(p_question_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct text;
  v_match_id uuid;
  v_paid integer := 0;
  r record;
BEGIN
  SELECT correct_answer, match_id
  INTO v_correct, v_match_id
  FROM prediction_questions
  WHERE id = p_question_id;

  IF v_correct IS NULL OR btrim(v_correct) = '' THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT p.id, p.user_id, p.answer
    FROM predictions p
    WHERE p.question_id = p_question_id
      AND p.xp_awarded = false
  LOOP
    IF r.answer = v_correct THEN
      PERFORM award_xp(r.user_id, v_match_id, 75, 'correct_prediction');
      UPDATE predictions
      SET is_correct = true, xp_awarded = true
      WHERE id = r.id;
      v_paid := v_paid + 1;
    ELSE
      UPDATE predictions
      SET is_correct = false, xp_awarded = true
      WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_paid;
END;
$$;

-- Auto-pay when admin marks correct answer on a question
CREATE OR REPLACE FUNCTION public.trg_pay_on_correct_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.correct_answer IS NOT NULL
     AND btrim(NEW.correct_answer) <> ''
     AND (OLD.correct_answer IS DISTINCT FROM NEW.correct_answer) THEN
    PERFORM pay_question_predictions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prediction_questions_pay_on_correct ON prediction_questions;
CREATE TRIGGER prediction_questions_pay_on_correct
  AFTER UPDATE OF correct_answer ON prediction_questions
  FOR EACH ROW
  EXECUTE FUNCTION trg_pay_on_correct_answer();

-- ─── Match payout (team votes + any unpaid predictions with correct set) ────
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

GRANT EXECUTE ON FUNCTION public.award_xp(uuid, uuid, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_question_predictions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payout_match(uuid) TO anon, authenticated;
