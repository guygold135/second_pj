-- Add deadline columns to goals if they don't exist (fixes "Could not find deadline_from" error)
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS deadline_from date,
  ADD COLUMN IF NOT EXISTS deadline_to date;
