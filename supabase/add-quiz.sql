-- Run in Supabase SQL Editor (additive — does not change predictions/votes)

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS quiz_open boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  is_correct boolean,
  xp_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_match ON public.quiz_questions(match_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON public.quiz_answers(question_id);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_questions_read ON public.quiz_questions;
CREATE POLICY quiz_questions_read ON public.quiz_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS quiz_questions_write ON public.quiz_questions;
CREATE POLICY quiz_questions_write ON public.quiz_questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quiz_answers_read ON public.quiz_answers;
CREATE POLICY quiz_answers_read ON public.quiz_answers FOR SELECT USING (true);
DROP POLICY IF EXISTS quiz_answers_write ON public.quiz_answers;
CREATE POLICY quiz_answers_write ON public.quiz_answers FOR ALL USING (true) WITH CHECK (true);

-- Pay +50 XP per correct quiz answer (separate from predictions)
CREATE OR REPLACE FUNCTION public.pay_quiz_question(p_question_id uuid)
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
      PERFORM award_xp(r.user_id, v_match_id, 50, 'quiz_correct');
      UPDATE quiz_answers SET is_correct = true, xp_awarded = true WHERE id = r.id;
      v_paid := v_paid + 1;
    ELSE
      UPDATE quiz_answers SET is_correct = false, xp_awarded = true WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_paid;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_pay_on_quiz_correct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.correct_answer IS NOT NULL
     AND btrim(NEW.correct_answer) <> ''
     AND (OLD.correct_answer IS DISTINCT FROM NEW.correct_answer) THEN
    PERFORM pay_quiz_question(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_questions_pay_on_correct ON public.quiz_questions;
CREATE TRIGGER quiz_questions_pay_on_correct
  AFTER UPDATE OF correct_answer ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pay_on_quiz_correct();

GRANT EXECUTE ON FUNCTION public.pay_quiz_question(uuid) TO anon, authenticated;

-- Allow quiz_correct in xp_ledger (run fix-quiz-xp-reason.sql instead if rows already exist)
