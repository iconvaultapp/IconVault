-- IconVault 10k-user audit fixes (database layer) — 2026-10-06.
--
-- WHAT THIS COVERS
--   H3  public.consume_api_quota(p_key_hash) — atomic quota increment RPC
--         (replaces the read-modify-write race in api-keys.server.ts).
--   H4  Column-level RLS lockdown on public.api_keys — users may only
--         UPDATE (name, revoked); used_this_month / monthly_quota /
--         key_hash / period_start become service-role-only.
--   H5  api_keys schema convergence (code-side part): detects a legacy
--         plaintext "key" column and adds key_hash idempotently. Never
--         drops columns and never migrates key material.
--   H9  public.admin_list_accounts(p_page, p_per) + public.admin_plan_breakdown()
--         — paginated, server-side-joined admin reads replacing the
--         unbounded selects + O(n^2) JS joins in admin.functions.ts.
--   M11 Converges INSERT RLS on download_events / download_history to the
--         tight WITH CHECK (auth.uid() = user_id) form. No user data is
--         deleted by this migration.
--
-- IDEMPOTENT: safe to re-run. Uses CREATE OR REPLACE, IF NOT EXISTS,
-- DROP ... IF EXISTS, and to_regclass() guards throughout.
--
-- NOTE (H5 — READ THIS): the migration history for public.api_keys is
-- contradictory. The 20260809*/20260825* migrations create a legacy
-- (user_id uuid UNIQUE, key text NOT NULL) shape that stores PLAINTEXT
-- keys; 20261001153000_api_keys.sql creates a hashed (key_hash) shape.
-- Code alone cannot tell which shape is live. AFTER APPLYING, inspect the
-- live schema in the Supabase dashboard (Table Editor -> api_keys, or run
-- \d public.api_keys in the SQL editor). If legacy rows exist, ROTATE
-- those keys by hand — plaintext keys cannot be re-hashed — then drop the
-- legacy table. This migration only converges what it safely can.

-- ================= H3: atomic quota consumption =================
-- Single statement: quota check + increment + 30-day rollover are atomic,
-- so concurrent requests can no longer race past the quota.
-- A key whose period expired is let through even if the old counter hit the
-- quota (the counter resets to 1 in the same statement).
DROP FUNCTION IF EXISTS public.consume_api_quota(text);
CREATE OR REPLACE FUNCTION public.consume_api_quota(p_key_hash text)
RETURNS TABLE(ok boolean, status int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET period_start = CASE
        WHEN now() - period_start > interval '30 days' THEN now()
        ELSE period_start END,
      used_this_month = CASE
        WHEN now() - period_start > interval '30 days' THEN 1
        ELSE used_this_month + 1 END
  WHERE key_hash = p_key_hash
    AND revoked = false
    AND (used_this_month < monthly_quota OR now() - period_start > interval '30 days');

  IF FOUND THEN
    RETURN QUERY SELECT true, 200;
  ELSE
    RETURN QUERY SELECT false, 429;
  END IF;
END;
$$;

-- The function is keyed by the secret hash (the credential itself), so it is
-- safe to expose beyond service_role; the API edge routes use service_role.
GRANT EXECUTE ON FUNCTION public.consume_api_quota(text) TO anon, authenticated, service_role;

-- ================= H4: column-level RLS lockdown on api_keys =================
-- Skipped automatically when api_keys is missing or still in the legacy
-- shape (no key_hash) — resolve H5 first in that case.
DO $$
DECLARE
  has_key_hash boolean;
BEGIN
  IF to_regclass('public.api_keys') IS NULL THEN
    RAISE NOTICE 'audit_fixes (H4): public.api_keys does not exist — skipping column-level lockdown.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'key_hash'
  ) INTO has_key_hash;

  IF NOT has_key_hash THEN
    RAISE NOTICE 'audit_fixes (H4): public.api_keys has no key_hash column (legacy shape?) — skipping column-level lockdown; resolve H5 first.';
    RETURN;
  END IF;

  -- Remove table-wide UPDATE so users can no longer touch used_this_month,
  -- monthly_quota, key_hash or period_start ...
  EXECUTE 'REVOKE UPDATE ON public.api_keys FROM authenticated';
  -- ... and re-grant only the safe columns: rename + self-revoke.
  EXECUTE 'GRANT UPDATE (name, revoked) ON public.api_keys TO authenticated';

  -- Replace the old permissive UPDATE policy. SELECT/INSERT policies and
  -- the intentional absence of a DELETE policy are left untouched.
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys';
  EXECUTE 'DROP POLICY IF EXISTS "Users rename/revoke own keys" ON public.api_keys';
  EXECUTE $pol$
    CREATE POLICY "Users rename/revoke own keys"
      ON public.api_keys FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
  $pol$;
END;
$$;

-- ================= H5: api_keys schema convergence (code-side part) =================
-- Detects the legacy plaintext "key" column and adds key_hash idempotently.
-- NEVER drops columns; NEVER migrates key material (see header NOTE).
DO $$
DECLARE
  has_legacy_key boolean;
  has_key_hash   boolean;
BEGIN
  IF to_regclass('public.api_keys') IS NULL THEN
    RAISE NOTICE 'audit_fixes (H5): public.api_keys does not exist — nothing to converge.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'key'
  ) INTO has_legacy_key;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'key_hash'
  ) INTO has_key_hash;

  IF has_legacy_key AND NOT has_key_hash THEN
    RAISE NOTICE 'audit_fixes (H5): public.api_keys has a legacy plaintext "key" column and no "key_hash". Do NOT auto-migrate: inspect the live DB in the Supabase dashboard, ROTATE any live keys by hand (plaintext keys cannot be re-hashed), then drop the legacy table/column.';
  END IF;

  IF NOT has_key_hash THEN
    ALTER TABLE public.api_keys ADD COLUMN key_hash text;
    RAISE NOTICE 'audit_fixes (H5): added nullable public.api_keys.key_hash (no constraints — backfill and constrain by hand after verifying the live shape).';
  END IF;
END;
$$;

-- ================= H9: admin account listing (paginated, server-side join) =================
-- Replaces the unbounded selects + O(users x profiles) JS joins in
-- admin.functions.ts listAccounts(). Admin-only via private.has_role
-- (the same SECURITY DEFINER guard already used by the download_events
-- "Admins view all downloads" policy); non-admins get an empty set.
DROP FUNCTION IF EXISTS public.admin_list_accounts(int, int);
CREATE OR REPLACE FUNCTION public.admin_list_accounts(p_page int, p_per int)
RETURNS TABLE(user_id uuid, email text, display_name text, plan text, is_banned boolean, roles text[])
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id,
         u.email,
         p.display_name,
         pl.plan,
         COALESCE(p.is_banned, false),
         COALESCE(array_agg(r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}')
  FROM auth.users u
  LEFT JOIN public.profiles   p  ON p.user_id  = u.id
  LEFT JOIN public.user_plans  pl ON pl.user_id = u.id
  LEFT JOIN public.user_roles  r  ON r.user_id  = u.id
  WHERE private.has_role(auth.uid(), 'admin')
  GROUP BY u.id, u.email, u.created_at, p.display_name, pl.plan, p.is_banned
  ORDER BY u.created_at DESC
  LIMIT GREATEST(p_per, 1)
  OFFSET GREATEST(p_page - 1, 0) * GREATEST(p_per, 1);
$$;

-- Replaces the unbounded plan-breakdown select in admin.functions.ts.
DROP FUNCTION IF EXISTS public.admin_plan_breakdown();
CREATE OR REPLACE FUNCTION public.admin_plan_breakdown()
RETURNS TABLE(plan text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl.plan, count(*)
  FROM public.user_plans pl
  WHERE private.has_role(auth.uid(), 'admin')
  GROUP BY pl.plan;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_accounts(int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_plan_breakdown() TO authenticated, service_role;

-- ================= M11: converge INSERT RLS on download tables =================
-- Both tables already carry tight WITH CHECK (auth.uid() = user_id) INSERT
-- policies in the migration history; this re-applies them idempotently so a
-- drifted live DB converges. SELECT/DELETE policies are untouched, and no
-- user data is deleted.
DO $$
BEGIN
  IF to_regclass('public.download_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users record their own downloads" ON public.download_events';
    EXECUTE $pol$
      CREATE POLICY "Users record their own downloads"
        ON public.download_events FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id)
    $pol$;
  ELSE
    RAISE NOTICE 'audit_fixes (M11): public.download_events does not exist — skipping.';
  END IF;

  IF to_regclass('public.download_history') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users insert own downloads" ON public.download_history';
    EXECUTE $pol$
      CREATE POLICY "Users insert own downloads"
        ON public.download_history FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id)
    $pol$;
  ELSE
    RAISE NOTICE 'audit_fixes (M11): public.download_history does not exist — skipping.';
  END IF;
END;
$$;
