DROP POLICY IF EXISTS "Signed-in users can read profiles" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Signed-in users can read roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can append telemetry events" ON public.telemetry_ledger;
REVOKE INSERT ON public.telemetry_ledger FROM anon;
CREATE POLICY "Startup accounts can append telemetry events"
  ON public.telemetry_ledger FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'startup'));