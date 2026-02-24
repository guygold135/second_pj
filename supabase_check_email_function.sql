-- Run this in Supabase Dashboard → SQL Editor.
-- Creates a function so the app can check if an email is registered before sending a reset link.
-- SECURITY DEFINER allows the function to read auth.users; we only return true/false.

CREATE OR REPLACE FUNCTION public.email_exists_for_reset(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = check_email);
$$;

-- Allow the app (anon key) to call this. Note: this lets anyone check if an email exists.
-- To avoid enumeration, use an Edge Function with service_role instead and don't grant to anon.
GRANT EXECUTE ON FUNCTION public.email_exists_for_reset(text) TO anon;
