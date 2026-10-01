-- Owner = the earliest granted admin (the main/site owner account)
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'::app_role
      AND ur.created_at = (
        SELECT MIN(ur2.created_at) FROM public.user_roles ur2 WHERE ur2.role = 'admin'::app_role
      )
  )
$$;

REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;

-- Site settings ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are readable by everyone"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Owner can insert site settings"
  ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner can update site settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner can delete site settings"
  ON public.site_settings FOR DELETE TO authenticated
  USING (public.is_owner(auth.uid()));

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value) VALUES
  ('general', '{"site_name":"IconVault","announcement":"","maintenance_mode":false,"signups_enabled":true,"waitlist_open":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Admin activity log -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read the admin log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can write the admin log"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()) AND actor_id = auth.uid());

-- Moderation is owner-only -------------------------------------------------
DROP POLICY IF EXISTS "Admins can update icon requests" ON public.icon_requests;
DROP POLICY IF EXISTS "Admins can delete icon requests" ON public.icon_requests;

CREATE POLICY "Owner can update icon requests"
  ON public.icon_requests FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner can delete icon requests"
  ON public.icon_requests FOR DELETE TO authenticated
  USING (public.is_owner(auth.uid()));