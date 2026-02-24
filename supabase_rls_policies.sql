-- ===========================================
-- Row Level Security (RLS) for Supabase Auth
-- ===========================================
-- Run this in Supabase Dashboard → SQL Editor after enabling Auth.
-- Ensures each user can only read/write their own rows (where user_id = auth.uid()).
-- ===========================================

-- missions
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own missions" ON public.missions;
CREATE POLICY "Users can manage own missions"
  ON public.missions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- categories_order (id = user_id per row)
ALTER TABLE public.categories_order ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own categories_order" ON public.categories_order;
CREATE POLICY "Users can manage own categories_order"
  ON public.categories_order FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- budget_data (id = user_id per row)
ALTER TABLE public.budget_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own budget_data" ON public.budget_data;
CREATE POLICY "Users can manage own budget_data"
  ON public.budget_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_settings (id = user_id per row)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own user_settings" ON public.user_settings;
CREATE POLICY "Users can manage own user_settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
