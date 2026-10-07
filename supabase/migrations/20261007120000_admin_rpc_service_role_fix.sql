-- IconVault admin RPC service_role fix — 2026-10-07.
--
-- BUG: admin_list_accounts() and admin_plan_breakdown() filtered with
--   WHERE private.has_role(auth.uid(), 'admin')
-- but the app calls these RPCs through the service_role key (supabaseAdmin),
-- where auth.uid() is NULL (service_role JWTs carry no sub claim).
-- has_role(NULL, 'admin') is always false, so the RPCs returned ZERO rows
-- even for a real admin — the admin panel showed no data.
--
-- The TypeScript layer already verifies admin via fetchRoleStatus() before
-- calling these RPCs, so accepting the service_role caller is safe.
-- Direct Data API calls from non-admin users are still blocked by the
-- has_role() check below.
--
-- Idempotent: safe to re-run.

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
  WHERE (auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'))
  GROUP BY u.id, u.email, u.created_at, p.display_name, pl.plan, p.is_banned
  ORDER BY u.created_at DESC
  LIMIT GREATEST(p_per, 1)
  OFFSET GREATEST(p_page - 1, 0) * GREATEST(p_per, 1);
$$;

CREATE OR REPLACE FUNCTION public.admin_plan_breakdown()
RETURNS TABLE(plan text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl.plan, count(*)
  FROM public.user_plans pl
  WHERE (auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'))
  GROUP BY pl.plan;
$$;
