-- ===========================================
-- Goals and Missions tables (run once in Supabase)
-- ===========================================
-- In Supabase: Dashboard → SQL Editor → New query → paste and run.
-- Or use: supabase db push (if using Supabase CLI).
-- ===========================================

-- goals: one row per goal, linked to user
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  tracking_mode text,
  progress_percent numeric,
  target_hours numeric,
  logged_hours numeric,
  time_label text,
  target_count integer,
  current_count integer,
  milestone_label text,
  deadline_from date,
  deadline_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- missions: one row per mission, optional goal_id for goals
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  recurrence text NOT NULL DEFAULT 'none',
  duration text DEFAULT '',
  target_count integer,
  progress_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  order_in_category integer,
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
  weight_percent numeric
);

CREATE INDEX IF NOT EXISTS idx_missions_user_id ON public.missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_goal_id ON public.missions(goal_id);

-- categories_order: one row per user, stores category order as JSON array
CREATE TABLE IF NOT EXISTS public.categories_order (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "order" jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- ===========================================
-- RLS (Row Level Security)
-- ===========================================
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own missions" ON public.missions;
CREATE POLICY "Users can manage own missions"
  ON public.missions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.categories_order ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own categories_order" ON public.categories_order;
CREATE POLICY "Users can manage own categories_order"
  ON public.categories_order FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
