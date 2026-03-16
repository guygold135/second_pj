-- Add optional deadline column to missions (ISO date YYYY-MM-DD for calendar placement)
-- Run in Supabase: Dashboard → SQL Editor → New query → paste and run.
-- Or: supabase db push (if using Supabase CLI)
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS deadline text;

COMMENT ON COLUMN public.missions.deadline IS 'Optional mission deadline (YYYY-MM-DD); used for calendar display and staking.';
