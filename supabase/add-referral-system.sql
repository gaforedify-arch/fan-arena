-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — Referral System
-- Run entire file in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all operations are idempotent)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Add columns to users ────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ref_code    text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.users(id);

-- ─── 2. Function to generate a unique 7-char ref code ───────────────
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code   text;
  v_exists boolean;
  chars    text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I (ambiguous)
  i        int;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..7 LOOP
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.users WHERE ref_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- ─── 3. Trigger: auto-assign ref_code on new user insert ────────────
CREATE OR REPLACE FUNCTION public.trg_set_ref_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ref_code IS NULL OR NEW.ref_code = '' THEN
    NEW.ref_code := public.generate_ref_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_ref_code ON public.users;
CREATE TRIGGER users_set_ref_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_ref_code();

-- ─── 4. Backfill existing users without a ref_code ──────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE ref_code IS NULL LOOP
    UPDATE public.users SET ref_code = public.generate_ref_code() WHERE id = r.id;
  END LOOP;
END $$;

-- ─── 5. app_config — tournament end date (admin can UPDATE value) ────
CREATE TABLE IF NOT EXISTS public.app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_config_read ON public.app_config;
CREATE POLICY app_config_read ON public.app_config
  FOR SELECT USING (true);

-- Set this to your actual tournament end date/time (UTC)
-- UPDATE public.app_config SET value = '2026-06-30T23:59:59Z' WHERE key = 'tournament_end_date';
INSERT INTO public.app_config (key, value)
VALUES ('tournament_end_date', '2026-06-30T23:59:59Z')
ON CONFLICT (key) DO NOTHING;

-- ─── 6. Expand xp_ledger reason check to include 'referral' ─────────
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
    'profile_completed'
  ));

-- ─── 7. process_referral(code, new_user_id) → jsonb ─────────────────
--   Awards 200 XP normally, 400 XP in last-2-days bonus window.
--   Idempotent: safe to call multiple times for same user.
CREATE OR REPLACE FUNCTION public.process_referral(
  p_referrer_code text,
  p_new_user_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id      uuid;
  v_already_referred boolean;
  v_tournament_end   timestamptz;
  v_days_left        numeric;
  v_is_bonus         boolean := false;
  v_xp               integer;
BEGIN
  -- Look up referrer
  SELECT id INTO v_referrer_id
  FROM users
  WHERE ref_code = upper(btrim(p_referrer_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  -- No self-referral
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  -- Only refer once
  SELECT (referred_by IS NOT NULL) INTO v_already_referred
  FROM users WHERE id = p_new_user_id;

  IF v_already_referred THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  -- Check bonus window (last 2 days of tournament)
  SELECT value::timestamptz INTO v_tournament_end
  FROM app_config WHERE key = 'tournament_end_date';

  IF v_tournament_end IS NOT NULL THEN
    v_days_left := EXTRACT(EPOCH FROM (v_tournament_end - now())) / 86400.0;
    v_is_bonus  := (v_days_left >= 0 AND v_days_left <= 2);
  END IF;

  v_xp := CASE WHEN v_is_bonus THEN 400 ELSE 200 END;

  -- Record referral on the new user
  UPDATE users SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  -- Award XP to referrer
  PERFORM award_xp(v_referrer_id, NULL, v_xp, 'referral');

  RETURN jsonb_build_object(
    'ok',          true,
    'xp_awarded',  v_xp,
    'is_bonus',    v_is_bonus,
    'referrer_id', v_referrer_id
  );
END;
$$;

-- ─── 8. get_referral_stats(user_id) → jsonb ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code       text;
  v_referred_count integer;
  v_xp_earned      bigint;
BEGIN
  SELECT ref_code INTO v_ref_code FROM users WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_referred_count
  FROM users WHERE referred_by = p_user_id;

  SELECT COALESCE(SUM(xp_amount), 0) INTO v_xp_earned
  FROM xp_ledger WHERE user_id = p_user_id AND reason = 'referral';

  RETURN jsonb_build_object(
    'ref_code',       v_ref_code,
    'referred_count', v_referred_count,
    'xp_earned',      v_xp_earned
  );
END;
$$;

-- ─── 9. get_top_referrers(limit) → table ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_referrers(p_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, name text, referred_count bigint, xp_earned bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id)::bigint,
    (SELECT COALESCE(SUM(xp_amount), 0) FROM xp_ledger l
       WHERE l.user_id = u.id AND l.reason = 'referral')::bigint
  FROM users u
  WHERE EXISTS (SELECT 1 FROM users r WHERE r.referred_by = u.id)
  ORDER BY 3 DESC, 4 DESC
  LIMIT p_limit;
END;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.generate_ref_code()                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral(text, uuid)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(uuid)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_referrers(integer)            TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- After running, update the tournament end date:
--   UPDATE public.app_config
--   SET value = 'YYYY-MM-DDTHH:MM:SSZ', updated_at = now()
--   WHERE key = 'tournament_end_date';
-- ═══════════════════════════════════════════════════════════════════
