-- Stakes table: financial commitments for missions/goals
CREATE TABLE IF NOT EXISTS public.stakes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  description text,
  due_date timestamptz,
  customer_id text,
  payment_method_id text,
  charge_id text,
  status text NOT NULL DEFAULT 'pending_card'
    CHECK (status IN ('pending_card', 'active', 'charged', 'succeeded', 'cancelled')),
  failure_mode text NOT NULL DEFAULT 'both'
    CHECK (failure_mode IN ('self_report', 'auto_deadline', 'both')),
  item_id text NOT NULL,
  item_type text NOT NULL
    CHECK (item_type IN ('mission', 'goal')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stakes"
  ON public.stakes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.stakes IS 'Financial stakes for missions and goals; charged when user does not complete.';
