-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — Raise XP floor: predictions 75→100, quiz 50→100
-- Run in Supabase Dashboard → SQL Editor
-- Safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Predictions: 75 XP → 100 XP ────────────────────────────────
CREATE OR REPLACE FUNCTION public.pay_question_predictions(p_question_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct  text;
  v_match_id uuid;
  v_paid     integer := 0;
  r          record;
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
      PERFORM award_xp(r.user_id, v_match_id, 100, 'correct_prediction');
      UPDATE predictions SET is_correct = true,  xp_awarded = true WHERE id = r.id;
      v_paid := v_paid + 1;
    ELSE
      UPDATE predictions SET is_correct = false, xp_awarded = true WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_paid;
END;
$$;

-- ─── 2. Quiz: 50 XP → 100 XP ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pay_quiz_question(p_question_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct  text;
  v_match_id uuid;
  v_paid     integer := 0;
  r          record;
BEGIN
  SELECT correct_answer, match_id
  INTO v_correct, v_match_id
  FROM quiz_questions
  WHERE id = p_question_id;

  IF v_correct IS NULL OR btrim(v_correct) = '' THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT a.id, a.user_id, a.answer
    FROM quiz_answers a
    WHERE a.question_id = p_question_id
      AND a.xp_awarded = false
  LOOP
    IF r.answer = v_correct THEN
      PERFORM award_xp(r.user_id, v_match_id, 100, 'quiz_correct');
      UPDATE quiz_answers SET is_correct = true,  xp_awarded = true WHERE id = r.id;
      v_paid := v_paid + 1;
    ELSE
      UPDATE quiz_answers SET is_correct = false, xp_awarded = true WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_paid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pay_question_predictions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_quiz_question(uuid)        TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- After running, all future payouts use 100 XP.
-- Already-paid rows in xp_ledger keep their old amounts.
-- ═══════════════════════════════════════════════════════════════════
