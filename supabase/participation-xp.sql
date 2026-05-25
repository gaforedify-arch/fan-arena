-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — Participation XP (run entire file in SQL Editor)
-- Every vote / prediction / quiz answer earns 100 XP instantly.
-- No correct-answer gate. Admin can still mark correct answers for
-- display feedback; it no longer affects XP.
-- Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Votes: 100 XP on first vote (INSERT) ────────────────────────
CREATE OR REPLACE FUNCTION public.trg_vote_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM award_xp(NEW.user_id, NEW.match_id, 100, 'correct_vote');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block the vote save
  END;
  NEW.xp_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_award_xp ON public.votes;
CREATE TRIGGER votes_award_xp
  BEFORE INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vote_xp();

-- ─── 2. Predictions: 100 XP on submission ───────────────────────────
CREATE OR REPLACE FUNCTION public.trg_prediction_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM award_xp(NEW.user_id, NEW.match_id, 100, 'correct_prediction');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  NEW.xp_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS predictions_award_xp ON public.predictions;
CREATE TRIGGER predictions_award_xp
  BEFORE INSERT ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prediction_xp();

-- ─── 3. Quiz answers: 100 XP on submission ──────────────────────────
CREATE OR REPLACE FUNCTION public.trg_quiz_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM award_xp(NEW.user_id, NEW.match_id, 100, 'quiz_correct');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  NEW.xp_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_answers_award_xp ON public.quiz_answers;
CREATE TRIGGER quiz_answers_award_xp
  BEFORE INSERT ON public.quiz_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quiz_xp();

-- ─── 4. pay_question_predictions: mark is_correct only (no XP) ──────
--   XP already awarded on submission. Admin still marks correct answer
--   so users can see green/red feedback in the UI.
CREATE OR REPLACE FUNCTION public.pay_question_predictions(p_question_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct text;
  v_marked  integer := 0;
BEGIN
  SELECT correct_answer INTO v_correct
  FROM prediction_questions WHERE id = p_question_id;

  IF v_correct IS NULL OR btrim(v_correct) = '' THEN
    RETURN 0;
  END IF;

  UPDATE predictions
  SET is_correct = (answer = v_correct)
  WHERE question_id = p_question_id
    AND is_correct IS NULL;

  GET DIAGNOSTICS v_marked = ROW_COUNT;
  RETURN v_marked;
END;
$$;

-- ─── 5. pay_quiz_question: mark is_correct only (no XP) ─────────────
CREATE OR REPLACE FUNCTION public.pay_quiz_question(p_question_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct text;
  v_marked  integer := 0;
BEGIN
  SELECT correct_answer INTO v_correct
  FROM quiz_questions WHERE id = p_question_id;

  IF v_correct IS NULL OR btrim(v_correct) = '' THEN
    RETURN 0;
  END IF;

  UPDATE quiz_answers
  SET is_correct = (answer = v_correct)
  WHERE question_id = p_question_id
    AND is_correct IS NULL;

  GET DIAGNOSTICS v_marked = ROW_COUNT;
  RETURN v_marked;
END;
$$;

-- ─── 6. payout_match: XP already awarded; just mark is_correct ───────
CREATE OR REPLACE FUNCTION public.payout_match(p_match_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner      text;
  v_votes_count integer := 0;
  v_preds_marked integer := 0;
  v_q_marked    integer;
  r_q           record;
BEGIN
  SELECT winner_team INTO v_winner
  FROM matches WHERE id = p_match_id;

  IF v_winner IS NULL THEN
    RAISE EXCEPTION 'Set match winner before running payout';
  END IF;

  -- Count winning votes (XP was already awarded on submission)
  SELECT COUNT(*) INTO v_votes_count
  FROM votes
  WHERE match_id = p_match_id AND team_picked = v_winner;

  -- Mark is_correct on predictions for this match
  FOR r_q IN
    SELECT id FROM prediction_questions
    WHERE match_id = p_match_id
      AND correct_answer IS NOT NULL
      AND btrim(correct_answer) <> ''
  LOOP
    v_q_marked := pay_question_predictions(r_q.id);
    v_preds_marked := v_preds_marked + v_q_marked;
  END LOOP;

  RETURN json_build_object(
    'votes_paid',       v_votes_count,
    'predictions_paid', v_preds_marked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.trg_vote_xp()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_prediction_xp()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_quiz_xp()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_question_predictions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_quiz_question(uuid)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payout_match(uuid)             TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- What changes after running this:
--   • Every vote    → +100 XP immediately on save
--   • Every prediction → +100 XP immediately on save
--   • Every quiz answer → +100 XP immediately on save
--   • Admin "mark correct" still works for UI feedback (green/red)
--     but no longer moves XP
--   • payout_match still counts winning votes for the summary but
--     no longer issues duplicate XP
-- ═══════════════════════════════════════════════════════════════════
