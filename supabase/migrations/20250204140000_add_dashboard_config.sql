-- Add dashboard_config to user_settings for customizable widget dashboard layout.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS dashboard_config jsonb;
