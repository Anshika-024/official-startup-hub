CREATE OR REPLACE FUNCTION public.public_pilot_contracts()
RETURNS TABLE (startup_name text, total_amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.startup_name, SUM(pm.amount)::numeric
  FROM public.payment_milestones pm
  GROUP BY pm.startup_name
$$;

REVOKE ALL ON FUNCTION public.public_pilot_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pilot_contracts() TO anon, authenticated, service_role;