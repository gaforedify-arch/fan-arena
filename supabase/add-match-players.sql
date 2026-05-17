-- Run in Supabase SQL Editor
-- Links prediction questions to a specific player (optional)

ALTER TABLE public.prediction_questions
  ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_questions_player
  ON public.prediction_questions(player_id);
