# Supabase setup for goals & missions

So that **goals and missions** (and their link) work and persist after refresh, you need the right tables and RLS in Supabase.

## 1. Run migrations in order

In **Supabase Dashboard → SQL Editor**, run these in order (if you haven’t already):

1. **Create goals and missions tables (and RLS)**  
   Open and run:
   - `supabase/migrations/20250204100000_create_goals_and_missions.sql`

2. **Add repeat columns to missions** (optional, for recurring missions)  
   Open and run:
   - `supabase/migrations/20250226000000_add_mission_repeat_columns.sql`

Or with the Supabase CLI from the project root:

```bash
supabase db push
```

## 2. What gets created

- **`public.goals`** – id, user_id, title, tracking_mode, deadline_from, deadline_to, etc.
- **`public.missions`** – id, user_id, title, category, goal_id, order_in_category, etc.
- **`public.categories_order`** – id (= user_id), "order" (JSON array), user_id  
- **RLS** so each user only sees/edits their own rows (`auth.uid() = user_id`).

## 3. If you already have tables

If `goals` or `missions` already exist but are missing columns:

- **goals**: ensure they have at least `id`, `user_id`, `title`, `tracking_mode`, `deadline_from`, `deadline_to`, `created_at`, `updated_at`.
- **missions**: ensure they have at least `id`, `user_id`, `title`, `category`, `recurrence`, `duration`, `goal_id`, `order_in_category`, `is_completed`, `created_at`, `completed_at`, `target_count`, `progress_count`, `weight_percent`.

Then run the RLS block from `20250204100000_create_goals_and_missions.sql` (the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` parts) so the app can read/write with the logged-in user.

## 4. Env vars

In the app (e.g. `.env`):

- `VITE_SUPABASE_URL` = your project URL  
- `VITE_SUPABASE_ANON_KEY` = your anon/public key  

No other Supabase config is required for goals and missions to work.

## 5. If goals/missions still don’t show in Supabase

- **Sign in**: The app only writes when there is a Supabase session. Use **Sign in** (not a custom auth) so the session is set. If you see a toast like “Not signed in — goal and missions not saved to cloud”, sign in and try again.
- **Browser console**: Open DevTools → Console. On save/load you’ll see `[GoalsContext]` / `[MissionsContext]` logs. On failure you’ll see “Save to Supabase failed” or “Failed to persist goal/missions” with the error. Fix any RLS or column errors reported there.
- **RLS**: Tables `goals` and `missions` must have RLS enabled and a policy that allows the signed-in user to read/write their own rows (`auth.uid() = user_id`). Run the RLS block in `20250204100000_create_goals_and_missions.sql` if you haven’t.
- **Columns**: Row shape must match the app (e.g. `user_id`, `goal_id`, `deadline_from`, `deadline_to` on goals; `user_id`, `goal_id`, `order_in_category` on missions). Add any missing columns so inserts/updates don’t fail.
- **"0 goals" but missions load**: In Table Editor check that `goals` has a **`user_id`** column and rows use your signed-in user's UUID. Run `SELECT id, user_id, title FROM public.goals LIMIT 10;` in SQL Editor; if rows exist but the app loads 0, fix RLS to use `auth.uid() = user_id`. If `user_id` is missing: `ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);` then backfill and run the RLS block.
- **Old missions cleanup**: Run in SQL Editor:  
  `DELETE FROM public.missions WHERE goal_id IS NOT NULL AND goal_id NOT IN (SELECT id FROM public.goals);`
