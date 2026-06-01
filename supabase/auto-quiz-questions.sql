-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — Auto Quiz Questions
-- Creates a template bank + auto-assigns 5 questions per match
-- Does NOT change quiz_questions, quiz_answers, XP, or admin flow
-- Run once in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Template bank table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_question_templates (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text   NOT NULL,
  category      text   NOT NULL DEFAULT 'fun',
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_question_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_templates_read ON public.quiz_question_templates;
CREATE POLICY quiz_templates_read ON public.quiz_question_templates
  FOR SELECT USING (true);

-- ─── 2. Seed 15 templates ────────────────────────────────────────────
-- {team_a} and {team_b} are replaced with real team names at match time
-- Options are always [team_a_name, team_b_name]
INSERT INTO public.quiz_question_templates (question_text, category, sort_order) VALUES

  -- Prediction
  ('Who wins tonight?',                                                          'prediction', 1),
  ('Who scores more in the powerplay?',                                          'prediction', 2),
  ('Which team takes more wickets tonight?',                                     'prediction', 3),
  ('Which team wins the toss AND the match?',                                    'prediction', 4),
  ('Which team do you trust with a 10-run last-over chase?',                     'prediction', 5),

  -- Rivalry / Confidence
  ('If your life depended on one final over — which team are you choosing?',     'rivalry',    6),
  ('Who chokes under pressure tonight?',                                         'rivalry',    7),
  ('Which team''s captain makes better decisions under pressure?',               'rivalry',    8),
  ('Which team has the better batting lineup on paper?',                         'rivalry',    9),

  -- Crowd Energy / Fun
  ('Which team gives final boss energy tonight?',                                'fun',        10),
  ('Whose fans are louder tonight?',                                             'fun',        11),
  ('If this were a Bollywood movie, who is the villain?',                        'fun',        12),
  ('Which team has better "we are going to win" energy right now?',              'fun',        13),
  ('Who takes the final game tonight?',                                          'fun',        14),
  ('One team wins, one cries tonight — pick the winner.',                        'fun',        15)

ON CONFLICT DO NOTHING;

-- ─── 3. Core function — assign 5 questions to a match ────────────────
CREATE OR REPLACE FUNCTION public.assign_quiz_questions(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_a      text;
  v_team_b      text;
  v_template    record;
  v_sort        integer := 1;
  v_q_text      text;
  v_options     jsonb;
BEGIN
  -- Get short_name (fallback to name) for both teams
  SELECT
    COALESCE(NULLIF(btrim(ta.short_name), ''), ta.name),
    COALESCE(NULLIF(btrim(tb.short_name), ''), tb.name)
  INTO v_team_a, v_team_b
  FROM public.matches m
  JOIN public.teams ta ON ta.id = m.team_a_id
  JOIN public.teams tb ON tb.id = m.team_b_id
  WHERE m.id = p_match_id;

  -- Skip if teams not set yet
  IF v_team_a IS NULL OR v_team_b IS NULL THEN
    RETURN;
  END IF;

  -- Pick 5 random active templates
  FOR v_template IN
    SELECT id, question_text
    FROM public.quiz_question_templates
    WHERE is_active = true
    ORDER BY random()
    LIMIT 5
  LOOP
    -- Replace placeholders with real team names
    v_q_text  := replace(replace(v_template.question_text, '{team_a}', v_team_a), '{team_b}', v_team_b);
    v_options := jsonb_build_array(v_team_a, v_team_b);

    INSERT INTO public.quiz_questions
      (match_id, question_key, question_text, options, correct_answer, sort_order)
    VALUES
      (p_match_id, 'auto_' || v_sort, v_q_text, v_options, NULL, v_sort)
    ON CONFLICT (match_id, question_key) DO NOTHING;

    v_sort := v_sort + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_quiz_questions(uuid) TO anon, authenticated;

-- ─── 4. Trigger — fires on every new match insert ────────────────────
CREATE OR REPLACE FUNCTION public.trg_auto_quiz_questions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_a_id IS NOT NULL AND NEW.team_b_id IS NOT NULL THEN
    PERFORM public.assign_quiz_questions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_auto_quiz ON public.matches;
CREATE TRIGGER matches_auto_quiz
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_quiz_questions();

-- ─── 5. Backfill — existing matches with no quiz questions ────────────
DO $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT m.id
    FROM public.matches m
    WHERE m.team_a_id IS NOT NULL
      AND m.team_b_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.quiz_questions q WHERE q.match_id = m.id
      )
  LOOP
    PERFORM public.assign_quiz_questions(r.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled quiz questions for % existing match(es)', v_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- After running this:
--   • All existing matches with no questions → get 5 auto questions
--   • Every new match you create → gets 5 questions instantly
--   • You can still add/edit/delete questions in admin as usual
--   • Auto questions use question_key = auto_1..auto_5
--   • Set correct_answer in admin after the match to pay out XP
-- ═══════════════════════════════════════════════════════════════════
