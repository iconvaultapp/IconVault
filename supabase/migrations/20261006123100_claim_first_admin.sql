-- Atomic first-admin claim (M7).
--
-- The old code did check-then-act from TypeScript: two simultaneous first
-- registrations could both pass the "no admin exists" check and both become
-- admin. Here the check + insert run inside ONE statement under a
-- transaction-scoped advisory lock, so concurrent claims serialize and only
-- the first one wins.
--
-- Fails closed: when no owner email is supplied (or it does not match the
-- caller's verified auth email), nobody is granted anything.
--
-- Called from src/lib/admin-roles.server.ts via supabaseAdmin.rpc.
-- Run this migration on the live database before deploying the code change.

CREATE OR REPLACE FUNCTION public.claim_first_admin(p_user_id uuid, p_owner_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fail closed: no owner email configured -> no claim possible.
  IF p_owner_email IS NULL OR btrim(p_owner_email) = '' THEN
    RETURN false;
  END IF;

  -- Serialize concurrent claims; the lock is released at transaction end.
  PERFORM pg_advisory_xact_lock(hashtext('iconvault_claim_first_admin'));

  -- Someone already claimed the slot.
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;

  -- The caller must be the configured owner (verified auth email).
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id AND lower(email) = lower(btrim(p_owner_email))
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

-- Only the service role may call this (it runs with elevated privileges).
REVOKE ALL ON FUNCTION public.claim_first_admin(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin(uuid, text) TO service_role;
