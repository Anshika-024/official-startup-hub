-- NOTE (prototype): SELECT is intentionally open to anon/authenticated because this
-- prototype has no auth system yet. In production these reads must be scoped to
-- authenticated government officials (payment_milestones, startups, procurement_needs,
-- startup_pitches) via role-based policies.

-- Remove the tamper vector on the AI knowledge base.
DROP POLICY IF EXISTS "Anyone can attach embeddings" ON public.gfr_rules_kb;

-- Enable RLS everywhere (idempotent).
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gfr_rules_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_pitches ENABLE ROW LEVEL SECURITY;

-- Public read policies (recreate to guarantee anon + authenticated coverage).
DROP POLICY IF EXISTS "Payment milestones are publicly readable" ON public.payment_milestones;
CREATE POLICY "Payment milestones are publicly readable" ON public.payment_milestones
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Startups are publicly readable" ON public.startups;
CREATE POLICY "Startups are publicly readable" ON public.startups
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Rules are publicly readable" ON public.gfr_rules_kb;
CREATE POLICY "Rules are publicly readable" ON public.gfr_rules_kb
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Telemetry ledger is publicly readable" ON public.telemetry_ledger;
CREATE POLICY "Telemetry ledger is publicly readable" ON public.telemetry_ledger
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Procurement needs are publicly readable" ON public.procurement_needs;
CREATE POLICY "Procurement needs are publicly readable" ON public.procurement_needs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Startup pitches are publicly readable" ON public.startup_pitches;
CREATE POLICY "Startup pitches are publicly readable" ON public.startup_pitches
  FOR SELECT TO anon, authenticated USING (true);

-- Telemetry: append-only for clients (Simulate Live Pilot Telemetry button).
DROP POLICY IF EXISTS "Allow pilot telemetry inserts" ON public.telemetry_ledger;
CREATE POLICY "Anyone can append telemetry events" ON public.telemetry_ledger
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Privilege-level enforcement: no client-side writes anywhere; ledger rows are immutable.
REVOKE INSERT, UPDATE, DELETE ON public.payment_milestones FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.startups FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.gfr_rules_kb FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.telemetry_ledger FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.procurement_needs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.startup_pitches FROM anon, authenticated;

GRANT SELECT ON public.payment_milestones TO anon, authenticated;
GRANT SELECT ON public.startups TO anon, authenticated;
GRANT SELECT ON public.gfr_rules_kb TO anon, authenticated;
GRANT SELECT, INSERT ON public.telemetry_ledger TO anon, authenticated;
GRANT SELECT ON public.procurement_needs TO anon, authenticated;
GRANT SELECT ON public.startup_pitches TO anon, authenticated;

GRANT ALL ON public.payment_milestones TO service_role;
GRANT ALL ON public.startups TO service_role;
GRANT ALL ON public.gfr_rules_kb TO service_role;
GRANT ALL ON public.telemetry_ledger TO service_role;
GRANT ALL ON public.procurement_needs TO service_role;
GRANT ALL ON public.startup_pitches TO service_role;