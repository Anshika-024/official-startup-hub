CREATE TABLE public.telemetry_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  api_endpoint TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.telemetry_ledger TO anon;
GRANT SELECT ON public.telemetry_ledger TO authenticated;
GRANT ALL ON public.telemetry_ledger TO service_role;
ALTER TABLE public.telemetry_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Telemetry ledger is publicly readable" ON public.telemetry_ledger FOR SELECT TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_ledger;
INSERT INTO public.telemetry_ledger (ts, api_endpoint, action, status) VALUES
  ('2026-09-09T06:12:44Z', '/v1/pilots/4471/budget', 'BUDGET_LOCK', 'COMMITTED'),
  ('2026-09-09T05:58:02Z', '/v1/vendors/kyc/verify', 'KYC_VERIFY', 'COMMITTED'),
  ('2026-09-08T18:31:17Z', '/v1/sandbox/containers/spawn', 'SANDBOX_SPAWN', 'COMMITTED'),
  ('2026-09-08T14:02:55Z', '/v1/gfr/rule166/draft', 'MEMO_DRAFT', 'PENDING'),
  ('2026-09-08T09:44:10Z', '/v1/legacy/soap/bridge', 'BRIDGE_SYNC', 'COMMITTED');