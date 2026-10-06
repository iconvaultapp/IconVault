-- Atomic plan grant for the Dodo webhook (M10).
--
-- A delayed/retried yearly (or monthly) event must never overwrite a
-- lifetime plan: the ON CONFLICT update is conditional, so once a row is
-- 'lifetime' only an explicit admin action can change it. Lifetime rows are
-- still touched by nothing here (no updated_at churn on skipped updates).
--
-- Called from src/routes/api.billing.webhook.ts via supabaseAdmin.rpc.
-- Run this migration on the live database before deploying the code change.

CREATE OR REPLACE FUNCTION public.grant_plan(p_user_id uuid, p_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, purchased_at, updated_at)
  VALUES (p_user_id, p_plan, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        purchased_at = EXCLUDED.purchased_at,
        updated_at = EXCLUDED.updated_at
    WHERE public.user_plans.plan <> 'lifetime';
END;
$$;

-- Only the service role may call this (it runs with elevated privileges).
REVOKE ALL ON FUNCTION public.grant_plan(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_plan(uuid, text) TO service_role;
