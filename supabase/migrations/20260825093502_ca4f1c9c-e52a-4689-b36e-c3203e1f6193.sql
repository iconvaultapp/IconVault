REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;