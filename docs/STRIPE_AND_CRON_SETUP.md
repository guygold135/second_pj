# Stripe and auto-charge setup

This doc covers what you need to **actually charge money** (live Stripe) and to run **automatic charges by deadline** (cron).

## 0a. Create the `stakes` table (required once)

The Edge Function reads and writes the **stakes** table. If you see **500 – Could not find the table 'public.stakes'**, the table was never created in your Supabase database.

**Do this once:**

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Click **New query**.
3. Paste and run the SQL below (same as `supabase/migrations/20250204120000_create_stakes_table.sql`):

```sql
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

ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own stakes" ON public.stakes;
CREATE POLICY "Users can manage own stakes"
  ON public.stakes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

4. Click **Run**. You should see "Success". If the table already existed, that’s fine (`CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS` are safe to run again).

After this, try adding a stake again from the app.

## 0b. Deploy with JWT verification disabled (avoids 401)

Supabase’s gateway can return **401** if JWT verification is on and the token doesn’t match. To avoid that, deploy the function **without** JWT verification (the function still gets the request and validates the body):

```bash
npx supabase functions deploy stripe-stake --no-verify-jwt
```

Redeploy with this flag whenever you deploy `stripe-stake`. The function does not rely on the gateway for auth; it uses the body (e.g. `userId`) and its own secrets.

(If you still get **401**, the deploy did not apply. Run the deploy command again and wait a minute before retrying the app.)

## 1. Edge Function secrets (Supabase)

The Edge Function `stripe-stake` needs these **secrets** (Supabase Dashboard → Project Settings → Edge Functions → Secrets, or `supabase secrets set`):

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | From Stripe Dashboard → Developers → API keys. Use **live** key (starts with `sk_live_`) for real charges; use **test** key (`sk_test_`) for testing. |
| `SUPABASE_URL` | Your project URL, e.g. `https://xxxx.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard → Settings → API → `service_role` (not the anon key). Keep this private. |
| `CRON_SECRET` | (Optional) A random string you invent. If set, the `process_due_stakes` action will only run when the request body includes `cronSecret` matching this value. Use this when invoking the function from a cron job so that random callers cannot trigger it. |

## 2. Frontend env (live Stripe)

In `.env` (and your hosting env) set:

- `VITE_STRIPE_PUBLISHABLE_KEY` – Stripe **publishable** key (live: `pk_live_...`, test: `pk_test_...`).
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` – already used for the app and for calling the Edge Function.

After changing env, restart the dev server or redeploy the frontend.

## 3. Activating Stripe for real money

- In [Stripe Dashboard](https://dashboard.stripe.com), complete **account activation** (identity, bank account, etc.) so you can receive payouts.
- Use **live** API keys only in production; keep test keys for local/dev.
- Charges go to **your** Stripe account (the one that owns `STRIPE_SECRET_KEY`). There is no “recipient” transfer in this flow.

## 4. Auto-charge by deadline (cron)

The Edge Function supports the action **`process_due_stakes`**: it finds stakes that are `active`, past `due_date`, and have `failure_mode` `auto_deadline` or `both`, then for each checks if the mission/goal was completed; if not, it charges the card and marks the stake as `charged`.

To run this on a schedule (e.g. daily), use **pg_cron** and **pg_net** in Supabase:

1. In Supabase Dashboard → SQL Editor, run the following **once** (replace placeholders):

   - `YOUR_SUPABASE_URL` – e.g. `https://abcdefgh.supabase.co` (no trailing slash).
   - `YOUR_ANON_OR_SERVICE_ROLE_KEY` – anon key is enough for invoking the function; for extra security you can use a dedicated key or pass `CRON_SECRET` in the body (see below).
   - Optional: if you set `CRON_SECRET` in Edge Function secrets, add `"cronSecret": "your-secret"` to the JSON body.

```sql
-- Requires pg_cron and pg_net (Supabase usually has these enabled).
-- Run this in SQL Editor; replace YOUR_SUPABASE_URL and YOUR_ANON_OR_SERVICE_ROLE_KEY.

SELECT cron.schedule(
  'process-due-stakes-daily',
  '0 0 * * *',  -- every day at midnight UTC (adjust as needed)
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/stripe-stake',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_OR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('action', 'process_due_stakes')
  ) AS request_id;
  $$
);
```

2. To pass a cron secret (if you set `CRON_SECRET`):

```sql
body := jsonb_build_object('action', 'process_due_stakes', 'cronSecret', 'your-cron-secret')
```

3. To unschedule later:

```sql
SELECT cron.unschedule('process-due-stakes-daily');
```

## 5. Summary

| What | Status |
|------|--------|
| Charge when user clicks “charge me” | Implemented (Edge Function + frontend). |
| Mark stake as “succeeded” when user completes | Implemented. |
| Auto-charge after deadline | Implemented in Edge Function (`process_due_stakes`); you enable it by scheduling the above cron. |
| Real money | Use live Stripe keys, set Edge Function secrets, and activate your Stripe account. |
