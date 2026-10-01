CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND _user_id = (
    SELECT user_id FROM public.user_roles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_owner(uuid) TO authenticated, service_role;

-- Repoint every policy at the private helpers.
DROP POLICY "Admins can read the admin log" ON public.admin_activity_log;
CREATE POLICY "Admins can read the admin log" ON public.admin_activity_log
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Owner can write the admin log" ON public.admin_activity_log;
CREATE POLICY "Owner can write the admin log" ON public.admin_activity_log
  FOR INSERT TO authenticated WITH CHECK (private.is_owner(auth.uid()) AND actor_id = auth.uid());

DROP POLICY "Admins can read analytics" ON public.analytics_events;
CREATE POLICY "Admins can read analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can view all collections" ON public.icon_collections;
CREATE POLICY "Admins can view all collections" ON public.icon_collections
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Owner can delete icon requests" ON public.icon_requests;
CREATE POLICY "Owner can delete icon requests" ON public.icon_requests
  FOR DELETE TO authenticated USING (private.is_owner(auth.uid()));

DROP POLICY "Owner can update icon requests" ON public.icon_requests;
CREATE POLICY "Owner can update icon requests" ON public.icon_requests
  FOR UPDATE TO authenticated USING (private.is_owner(auth.uid())) WITH CHECK (private.is_owner(auth.uid()));

DROP POLICY "Users view their own requests" ON public.icon_requests;
CREATE POLICY "Users view their own requests" ON public.icon_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can view all search history" ON public.search_history;
CREATE POLICY "Admins can view all search history" ON public.search_history
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Owner can delete site settings" ON public.site_settings;
CREATE POLICY "Owner can delete site settings" ON public.site_settings
  FOR DELETE TO authenticated USING (private.is_owner(auth.uid()));

DROP POLICY "Owner can insert site settings" ON public.site_settings;
CREATE POLICY "Owner can insert site settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (private.is_owner(auth.uid()));

DROP POLICY "Owner can update site settings" ON public.site_settings;
CREATE POLICY "Owner can update site settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (private.is_owner(auth.uid())) WITH CHECK (private.is_owner(auth.uid()));

DROP POLICY "Admins can grant roles" ON public.user_roles;
CREATE POLICY "Admins can grant roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can revoke roles" ON public.user_roles;
CREATE POLICY "Admins can revoke roles" ON public.user_roles
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can view the waitlist" ON public.waitlist;
CREATE POLICY "Admins can view the waitlist" ON public.waitlist
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- Public, client-callable copies are no longer needed.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_owner(uuid);
DROP FUNCTION IF EXISTS public.claim_admin();