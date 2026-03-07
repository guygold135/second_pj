-- Add repeat-related columns to missions for persistent repeated missions
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS repeat_unit text
    CHECK (repeat_unit IS NULL OR repeat_unit IN ('minutes', 'hours', 'days', 'weeks', 'months')),
  ADD COLUMN IF NOT EXISTS repeat_value integer,
  ADD COLUMN IF NOT EXISTS missed_repeats integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS repeat_last_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS repeat_completed_count integer DEFAULT 0;

COMMENT ON COLUMN public.missions.repeat_unit IS 'Unit for custom repeat: minutes, hours, days, weeks, months';
COMMENT ON COLUMN public.missions.repeat_value IS 'Repeat every N units';
COMMENT ON COLUMN public.missions.missed_repeats IS 'Number of intervals passed without completing (uncompleted repeat count)';
COMMENT ON COLUMN public.missions.repeat_locked IS 'True when this mission was completed and locked (show repeat icon, no new copy)';
COMMENT ON COLUMN public.missions.repeat_last_evaluated_at IS 'Last time the repeat engine evaluated this mission';
COMMENT ON COLUMN public.missions.repeat_completed_count IS 'Number of times this repeated mission has been completed (shown on locked card)';
