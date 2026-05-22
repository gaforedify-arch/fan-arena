-- Run this once in Supabase SQL Editor before adding logo URLs in Admin.
-- Existing teams continue to work because the field is optional.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS logo_url text;
