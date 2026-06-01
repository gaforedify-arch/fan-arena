-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — Social Proof Seed Data
-- Adds realistic XP history & referral chains to existing test users
-- Safe: welcome/profile_completed only inserted if not already there
-- Run once in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  u1  uuid; -- sanketzambare008  (sanket)         — top user, 3 referrals
  u2  uuid; -- sanketuzambare    (Rahul sharma)    — 2nd, 2 referrals
  u3  uuid; -- rajashreecreativedesigner (Rb)      — referred by u2
  u4  uuid; -- gaforedify        (Amol)            — referred by u2
  u5  uuid; -- edifyfmrewards    (smamy)           — referred by u1
  u6  uuid; -- khushboo.nitnaware01 (Kn)           — independent
  u7  uuid; -- sanketzambare17   (sanket)          — independent
  u8  uuid; -- szghost13         (Rahul sharma)    — referred by u1
  u9  uuid; -- svinaykumar0532   (Rahul)           — referred by u1
  u10 uuid; -- uruuva.phenix     (N Nidhi)         — casual
  u11 uuid; -- speakmannmad      (S Mannmad)       — casual
  m1  uuid; -- earliest match
  m2  uuid; -- second match
  m3  uuid; -- third match
BEGIN

  -- ─── Get user IDs ──────────────────────────────────────────────────
  SELECT id INTO u1  FROM public.users WHERE email = 'sanketzambare008@gmail.com';
  SELECT id INTO u2  FROM public.users WHERE email = 'sanketuzambare@gmail.com';
  SELECT id INTO u3  FROM public.users WHERE email = 'rajashreecreativedesigner@gmail.com';
  SELECT id INTO u4  FROM public.users WHERE email = 'gaforedify@gmail.com';
  SELECT id INTO u5  FROM public.users WHERE email = 'edifyfmrewards@gmail.com';
  SELECT id INTO u6  FROM public.users WHERE email = 'khushboo.nitnaware01@gmail.com';
  SELECT id INTO u7  FROM public.users WHERE email = 'sanketzambare17@gmail.com';
  SELECT id INTO u8  FROM public.users WHERE email = 'szghost13@gmail.com';
  SELECT id INTO u9  FROM public.users WHERE email = 'svinaykumar0532@gmail.com';
  SELECT id INTO u10 FROM public.users WHERE email = 'uruuva.phenix@gmail.com';
  SELECT id INTO u11 FROM public.users WHERE email = 'speakmannmad@gmail.com';

  -- ─── Get 3 real match IDs ──────────────────────────────────────────
  SELECT id INTO m1 FROM public.matches ORDER BY day_number ASC, match_number ASC LIMIT 1 OFFSET 0;
  SELECT id INTO m2 FROM public.matches ORDER BY day_number ASC, match_number ASC LIMIT 1 OFFSET 1;
  SELECT id INTO m3 FROM public.matches ORDER BY day_number ASC, match_number ASC LIMIT 1 OFFSET 2;

  -- ─── 1. Referral chains ────────────────────────────────────────────
  -- u1 referred: smamy (u5), Rahul-ghost (u8), Rahul-vinay (u9)
  UPDATE public.users SET referred_by = u1
    WHERE id IN (u5, u8, u9) AND referred_by IS NULL;

  -- u2 referred: Rb (u3), Amol (u4)
  UPDATE public.users SET referred_by = u2
    WHERE id IN (u3, u4) AND referred_by IS NULL;

  -- ─── 2. Welcome XP (only if not already awarded) ───────────────────
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u1  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u1,  NULL, 500, 'welcome', now() - interval '8 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u2  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u2,  NULL, 500, 'welcome', now() - interval '7 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u3  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u3,  NULL, 500, 'welcome', now() - interval '7 days' + interval '4 hours');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u4  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u4,  NULL, 500, 'welcome', now() - interval '6 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u5  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u5,  NULL, 500, 'welcome', now() - interval '6 days' + interval '3 hours');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u6  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u6,  NULL, 500, 'welcome', now() - interval '5 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u7  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u7,  NULL, 500, 'welcome', now() - interval '5 days' + interval '6 hours');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u8  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u8,  NULL, 500, 'welcome', now() - interval '4 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u9  AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u9,  NULL, 500, 'welcome', now() - interval '4 days' + interval '5 hours');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u10 AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u10, NULL, 500, 'welcome', now() - interval '3 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u11 AND reason = 'welcome') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u11, NULL, 500, 'welcome', now() - interval '2 days');
  END IF;

  -- ─── 3. Profile completion XP (only active users who filled profile) ─
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u1 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u1, NULL, 400, 'profile_completed', now() - interval '8 days' + interval '1 hour');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u2 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u2, NULL, 400, 'profile_completed', now() - interval '7 days' + interval '1 hour');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u3 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u3, NULL, 400, 'profile_completed', now() - interval '7 days' + interval '5 hours');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u4 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u4, NULL, 400, 'profile_completed', now() - interval '6 days' + interval '1 hour');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u5 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u5, NULL, 400, 'profile_completed', now() - interval '6 days' + interval '4 hours');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u6 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u6, NULL, 400, 'profile_completed', now() - interval '5 days' + interval '1 hour');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u7 AND reason = 'profile_completed') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at)
    VALUES (u7, NULL, 400, 'profile_completed', now() - interval '5 days' + interval '7 hours');
  END IF;

  -- ─── 4. One-time referral bonus XP ─────────────────────────────────
  -- u1 referred 3 people → 200 XP each time
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u1 AND reason = 'referral') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
      (u1, NULL, 200, 'referral', now() - interval '6 days' + interval '3 hours'),
      (u1, NULL, 200, 'referral', now() - interval '4 days' + interval '1 hour'),
      (u1, NULL, 200, 'referral', now() - interval '4 days' + interval '5 hours');
  END IF;

  -- u2 referred 2 people → 200 XP each time
  IF NOT EXISTS (SELECT 1 FROM public.xp_ledger WHERE user_id = u2 AND reason = 'referral') THEN
    INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
      (u2, NULL, 200, 'referral', now() - interval '7 days' + interval '2 hours'),
      (u2, NULL, 200, 'referral', now() - interval '6 days' + interval '6 hours');
  END IF;

  -- ─── 5. Activity XP — votes, predictions, quiz ─────────────────────

  -- u1 (sanketzambare008): very active — 5 votes, 3 predictions, 3 quiz
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u1, m1, 100, 'correct_vote',       now() - interval '7 days' + interval '1 hour'),
    (u1, m1, 100, 'correct_prediction', now() - interval '7 days' + interval '2 hours'),
    (u1, m1, 100, 'quiz_correct',       now() - interval '7 days' + interval '3 hours'),
    (u1, m2, 100, 'correct_vote',       now() - interval '5 days' + interval '1 hour'),
    (u1, m2, 100, 'correct_prediction', now() - interval '5 days' + interval '2 hours'),
    (u1, m2, 100, 'quiz_correct',       now() - interval '5 days' + interval '3 hours'),
    (u1, m3, 100, 'correct_vote',       now() - interval '3 days' + interval '1 hour'),
    (u1, m3, 100, 'correct_vote',       now() - interval '3 days' + interval '1 hour 30 minutes'),
    (u1, m3, 100, 'correct_prediction', now() - interval '3 days' + interval '2 hours'),
    (u1, m3, 100, 'quiz_correct',       now() - interval '3 days' + interval '3 hours'),
    (u1, m3, 100, 'correct_vote',       now() - interval '1 day'  + interval '1 hour');

  -- u2 (sanketuzambare): active — 4 votes, 2 predictions, 2 quiz
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u2, m1, 100, 'correct_vote',       now() - interval '7 days' + interval '2 hours'),
    (u2, m1, 100, 'correct_prediction', now() - interval '7 days' + interval '4 hours'),
    (u2, m1, 100, 'quiz_correct',       now() - interval '7 days' + interval '5 hours'),
    (u2, m2, 100, 'correct_vote',       now() - interval '5 days' + interval '2 hours'),
    (u2, m2, 100, 'correct_prediction', now() - interval '5 days' + interval '4 hours'),
    (u2, m3, 100, 'correct_vote',       now() - interval '3 days' + interval '2 hours'),
    (u2, m3, 100, 'quiz_correct',       now() - interval '3 days' + interval '4 hours'),
    (u2, m3, 100, 'correct_vote',       now() - interval '2 days' + interval '1 hour');

  -- u3 (Rb): moderate — 3 votes, 2 predictions, 1 quiz
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u3, m1, 100, 'correct_vote',       now() - interval '7 days' + interval '3 hours'),
    (u3, m1, 100, 'correct_prediction', now() - interval '7 days' + interval '6 hours'),
    (u3, m2, 100, 'correct_vote',       now() - interval '5 days' + interval '3 hours'),
    (u3, m2, 100, 'correct_prediction', now() - interval '5 days' + interval '5 hours'),
    (u3, m3, 100, 'correct_vote',       now() - interval '3 days' + interval '3 hours'),
    (u3, m3, 100, 'quiz_correct',       now() - interval '3 days' + interval '5 hours');

  -- u4 (Amol): moderate — 2 votes, 1 prediction
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u4, m1, 100, 'correct_vote',       now() - interval '6 days' + interval '2 hours'),
    (u4, m2, 100, 'correct_vote',       now() - interval '5 days' + interval '6 hours'),
    (u4, m2, 100, 'correct_prediction', now() - interval '5 days' + interval '7 hours');

  -- u5 (smamy): light — 2 votes, 1 quiz
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u5, m2, 100, 'correct_vote',       now() - interval '5 days' + interval '4 hours'),
    (u5, m3, 100, 'correct_vote',       now() - interval '3 days' + interval '4 hours'),
    (u5, m3, 100, 'quiz_correct',       now() - interval '3 days' + interval '6 hours');

  -- u6 (Kn): light — 1 vote, 1 quiz
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u6, m2, 100, 'correct_vote',       now() - interval '5 days' + interval '5 hours'),
    (u6, m3, 100, 'quiz_correct',       now() - interval '2 days' + interval '2 hours');

  -- u7 (sanketzambare17): minimal — 1 vote
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u7, m3, 100, 'correct_vote',       now() - interval '2 days' + interval '3 hours');

  -- u8 (szghost13): just signed up, 1 vote
  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, created_at) VALUES
    (u8, m3, 100, 'correct_vote',       now() - interval '2 days' + interval '4 hours');

  -- u9, u10, u11: signed up only — no extra activity XP

  -- ─── 6. Passive referral XP ────────────────────────────────────────
  -- u1 earns 25 XP each time u5/u8/u9 do something

  INSERT INTO public.xp_ledger (user_id, match_id, xp_amount, reason, source_user_id, created_at) VALUES
    -- from u5 (smamy)
    (u1, m2, 25, 'referral_passive', u5, now() - interval '5 days' + interval '4 hours'),
    (u1, m3, 25, 'referral_passive', u5, now() - interval '3 days' + interval '4 hours'),
    (u1, m3, 25, 'referral_passive', u5, now() - interval '3 days' + interval '6 hours'),
    -- from u8 (szghost13)
    (u1, m3, 25, 'referral_passive', u8, now() - interval '2 days' + interval '4 hours'),
    -- from u9 (svinaykumar) — signed up, no activity yet so no passive yet
    -- total: 4 passive entries = 100 XP passive for u1

  -- u2 earns 25 XP each time u3/u4 do something
    (u2, m1, 25, 'referral_passive', u3, now() - interval '7 days' + interval '3 hours'),
    (u2, m1, 25, 'referral_passive', u3, now() - interval '7 days' + interval '6 hours'),
    (u2, m2, 25, 'referral_passive', u3, now() - interval '5 days' + interval '3 hours'),
    (u2, m2, 25, 'referral_passive', u3, now() - interval '5 days' + interval '5 hours'),
    (u2, m3, 25, 'referral_passive', u3, now() - interval '3 days' + interval '3 hours'),
    (u2, m3, 25, 'referral_passive', u3, now() - interval '3 days' + interval '5 hours'),
    (u2, m1, 25, 'referral_passive', u4, now() - interval '6 days' + interval '2 hours'),
    (u2, m2, 25, 'referral_passive', u4, now() - interval '5 days' + interval '6 hours'),
    (u2, m2, 25, 'referral_passive', u4, now() - interval '5 days' + interval '7 hours');
    -- total: 9 passive entries = 225 XP passive for u2

  -- ─── 7. Recalculate total_xp from ledger (source of truth) ─────────
  UPDATE public.users u
  SET total_xp = (
    SELECT COALESCE(SUM(xp_amount), 0)
    FROM public.xp_ledger l
    WHERE l.user_id = u.id
  )
  WHERE u.id IN (u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, u11);

END $$;
