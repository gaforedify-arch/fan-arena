-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — Passive Referral XP
-- Whoever referred a user earns the SAME XP as that user earns
-- from every vote / prediction / quiz answer they make.
-- Run entire file in SQL Editor. Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Add source_user_id column to xp_ledger ──────────────────────
--   Tracks which friend triggered the passive XP award.
ALTER TABLE public.xp_ledger
  ADD COLUMN IF NOT EXISTS source_user_id uuid REFERENCES public.users(id);

-- ─── 2. Add 'referral_passive' to reason check constraint ────────────
ALTER TABLE public.xp_ledger
  DROP CONSTRAINT IF EXISTS xp_ledger_reason_check;

ALTER TABLE public.xp_ledger
  ADD CONSTRAINT xp_ledger_reason_check
  CHECK (reason IN (
    'welcome',
    'correct_vote',
    'correct_prediction',
    'reaction',
    'quiz_correct',
    'referral',
    'referral_passive',
    'profile_completed'
  ));

-- ─── 3. Replace award_xp with 5-param version (source_user_id) ──────
--   Existing 4-arg callers still work (5th param defaults to NULL).
DROP FUNCTION IF EXISTS public.award_xp(uuid, uuid, integer, text);

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id        uuid,
  p_match_id       uuid,
  p_amount         integer,
  p_reason         text,
  p_source_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO xp_ledger (user_id, match_id, xp_amount, reason, source_user_id)
  VALUES (p_user_id, p_match_id, p_amount, p_reason, p_source_user_id);

  UPDATE users
  SET total_xp = COALESCE(total_xp, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(uuid, uuid, integer, text, uuid) TO anon, authenticated;

-- ─── 4. Updated triggers — award passive XP to referrer ─────────────

CREATE OR REPLACE FUNCTION public.trg_vote_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- XP to the voter
  BEGIN
    PERFORM award_xp(NEW.user_id, NEW.match_id, 100, 'correct_vote');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- 25% passive XP to whoever referred this voter
  BEGIN
    SELECT referred_by INTO v_referrer_id FROM users WHERE id = NEW.user_id;
    IF v_referrer_id IS NOT NULL THEN
      PERFORM award_xp(v_referrer_id, NEW.match_id, 25, 'referral_passive', NEW.user_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  NEW.xp_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_award_xp ON public.votes;
CREATE TRIGGER votes_award_xp
  BEFORE INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vote_xp();

-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_prediction_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  BEGIN
    PERFORM award_xp(NEW.user_id, NEW.match_id, 100, 'correct_prediction');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    SELECT referred_by INTO v_referrer_id FROM users WHERE id = NEW.user_id;
    IF v_referrer_id IS NOT NULL THEN
      PERFORM award_xp(v_referrer_id, NEW.match_id, 25, 'referral_passive', NEW.user_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  NEW.xp_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS predictions_award_xp ON public.predictions;
CREATE TRIGGER predictions_award_xp
  BEFORE INSERT ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prediction_xp();

-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_quiz_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  BEGIN
    PERFORM award_xp(NEW.user_id, NEW.match_id, 100, 'quiz_correct');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    SELECT referred_by INTO v_referrer_id FROM users WHERE id = NEW.user_id;
    IF v_referrer_id IS NOT NULL THEN
      PERFORM award_xp(v_referrer_id, NEW.match_id, 25, 'referral_passive', NEW.user_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  NEW.xp_awarded := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_answers_award_xp ON public.quiz_answers;
CREATE TRIGGER quiz_answers_award_xp
  BEFORE INSERT ON public.quiz_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quiz_xp();

-- ─── 5. get_passive_xp_stats(user_id) → jsonb ────────────────────────
--   Returns total passive XP + per-friend breakdown for the Invite tab.
CREATE OR REPLACE FUNCTION public.get_passive_xp_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   bigint;
  v_friends jsonb;
BEGIN
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_total
  FROM xp_ledger
  WHERE user_id = p_user_id AND reason = 'referral_passive';

  SELECT COALESCE(jsonb_agg(t ORDER BY t.xp_total DESC), '[]'::jsonb) INTO v_friends
  FROM (
    SELECT
      u.name            AS friend_name,
      x.source_user_id  AS friend_id,
      COUNT(*)::int     AS activity_count,
      SUM(x.xp_amount)::int AS xp_total
    FROM xp_ledger x
    JOIN users u ON u.id = x.source_user_id
    WHERE x.user_id        = p_user_id
      AND x.reason         = 'referral_passive'
      AND x.source_user_id IS NOT NULL
    GROUP BY u.id, u.name, x.source_user_id
  ) t;

  RETURN jsonb_build_object(
    'total_passive_xp', v_total,
    'friends',          v_friends
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_passive_xp_stats(uuid) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- After running this:
--   • Every vote by a referred user   → +100 XP to voter + +25 XP to referrer (25%)
--   • Every prediction by referred    → +100 XP to voter + +25 XP to referrer (25%)
--   • Every quiz answer by referred   → +100 XP to voter + +25 XP to referrer (25%)
--   • Invite tab shows passive XP total + per-friend breakdown
--   • xp_ledger tracks source_user_id so you can see exactly
--     which friend triggered each passive XP award
-- ═══════════════════════════════════════════════════════════════════
