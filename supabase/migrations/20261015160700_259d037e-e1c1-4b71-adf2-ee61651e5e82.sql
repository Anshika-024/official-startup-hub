-- procurement_needs: officials only
DROP POLICY IF EXISTS "Procurement needs are publicly readable" ON public.procurement_needs;
REVOKE SELECT ON public.procurement_needs FROM anon;
GRANT SELECT ON public.procurement_needs TO authenticated;
CREATE POLICY "Officials can read procurement needs"
  ON public.procurement_needs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'official'));

-- startup_pitches: officials all, startups their own
DROP POLICY IF EXISTS "Startup pitches are publicly readable" ON public.startup_pitches;
REVOKE SELECT ON public.startup_pitches FROM anon;
GRANT SELECT ON public.startup_pitches TO authenticated;
CREATE POLICY "Officials can read all startup pitches"
  ON public.startup_pitches FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'official'));
CREATE POLICY "Startup accounts can read their own pitch"
  ON public.startup_pitches FOR SELECT TO authenticated
  USING (startup_name = public.my_startup_name());

-- Public transparency: vendor name + sector only (no pitch text)
CREATE OR REPLACE FUNCTION public.public_pilot_vendors()
RETURNS TABLE (startup_name text, sector text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sp.startup_name, sp.sector, sp.created_at
  FROM public.startup_pitches sp
  ORDER BY sp.created_at
$$;
REVOKE ALL ON FUNCTION public.public_pilot_vendors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pilot_vendors() TO anon, authenticated, service_role;

-- gfr_rules_kb: server-side only
DROP POLICY IF EXISTS "Rules are publicly readable" ON public.gfr_rules_kb;
REVOKE SELECT ON public.gfr_rules_kb FROM anon, authenticated;
GRANT ALL ON public.gfr_rules_kb TO service_role;
REVOKE ALL ON FUNCTION public.match_gfr_rules(vector, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_gfr_rules(vector, integer) TO service_role;