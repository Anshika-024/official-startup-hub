REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_startup_name() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_startup_name() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.public_pilot_budget() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pilot_budget() TO anon, authenticated, service_role;