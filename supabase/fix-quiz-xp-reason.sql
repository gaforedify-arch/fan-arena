-- ═══════════════════════════════════════════════════════════════════
-- FAN ARENA — fix xp_ledger_reason_check (run entire file, then Run)
-- ═══════════════════════════════════════════════════════════════════

-- A) See EVERY reason value (including NULL / typos)
SELECT reason, COUNT(*) AS rows
FROM public.xp_ledger
GROUP BY reason
ORDER BY reason NULLS FIRST;

-- B) See rows that BLOCK the constraint (if any show here, fix in step D)
SELECT id, reason, xp_amount, created_at
FROM public.xp_ledger
WHERE reason IS NULL
   OR btrim(reason) NOT IN (
     'welcome',
     'correct_vote',
     'correct_prediction',
     'reaction',
     'quiz_correct',
     'prediction_correct',
     'vote_correct'
   );

-- C) Remove old constraint (always safe)
ALTER TABLE public.xp_ledger
  DROP CONSTRAINT IF EXISTS xp_ledger_reason_check;

-- D) Normalize old/wrong reason names to match your database
UPDATE public.xp_ledger SET reason = 'correct_prediction' WHERE reason = 'prediction_correct';
UPDATE public.xp_ledger SET reason = 'correct_vote'       WHERE reason = 'vote_correct';
UPDATE public.xp_ledger SET reason = 'welcome'            WHERE reason IS NULL OR btrim(reason) = '';

-- E) Map any other stray values to 'reaction' (only rows still not in allowed list)
UPDATE public.xp_ledger
SET reason = 'reaction'
WHERE reason IS NOT NULL
  AND btrim(reason) NOT IN (
    'welcome',
    'correct_vote',
    'correct_prediction',
    'reaction',
    'quiz_correct'
  );

-- F) Add constraint (run only after B returns 0 rows, or after D+E)
ALTER TABLE public.xp_ledger
  ADD CONSTRAINT xp_ledger_reason_check
  CHECK (reason IN (
    'welcome',
    'correct_vote',
    'correct_prediction',
    'reaction',
    'quiz_correct'
  ));
