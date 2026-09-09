CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.telemetry_ledger
  ADD COLUMN IF NOT EXISTS row_hash text,
  ADD COLUMN IF NOT EXISTS prev_hash text;

CREATE OR REPLACE FUNCTION public.telemetry_chain_payload(_prev_hash text, _ts timestamptz, _api_endpoint text, _action text, _status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(
    extensions.digest(
      _prev_hash || to_char(_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || _api_endpoint || _action || _status,
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.telemetry_ledger_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  last_hash text;
BEGIN
  SELECT t.row_hash INTO last_hash
  FROM public.telemetry_ledger t
  ORDER BY t.ts DESC, t.created_at DESC
  LIMIT 1;

  NEW.prev_hash := COALESCE(last_hash, repeat('0', 64));
  NEW.row_hash := public.telemetry_chain_payload(NEW.prev_hash, NEW.ts, NEW.api_endpoint, NEW.action, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS telemetry_ledger_hash_trg ON public.telemetry_ledger;
CREATE TRIGGER telemetry_ledger_hash_trg
BEFORE INSERT ON public.telemetry_ledger
FOR EACH ROW EXECUTE FUNCTION public.telemetry_ledger_hash();

-- back-fill existing rows into the chain, oldest first
DO $$
DECLARE
  r record;
  last_hash text := repeat('0', 64);
BEGIN
  FOR r IN SELECT id, ts, api_endpoint, action, status FROM public.telemetry_ledger ORDER BY ts ASC, created_at ASC LOOP
    UPDATE public.telemetry_ledger
    SET prev_hash = last_hash,
        row_hash = public.telemetry_chain_payload(last_hash, r.ts, r.api_endpoint, r.action, r.status)
    WHERE id = r.id;
    SELECT row_hash INTO last_hash FROM public.telemetry_ledger WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.verify_telemetry_chain()
RETURNS TABLE(total_records integer, is_valid boolean, broken_id uuid, broken_ts timestamptz, broken_endpoint text)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  last_hash text := repeat('0', 64);
  cnt integer := 0;
  expected text;
BEGIN
  total_records := 0;
  is_valid := true;
  broken_id := NULL;
  broken_ts := NULL;
  broken_endpoint := NULL;

  FOR r IN SELECT * FROM public.telemetry_ledger ORDER BY ts ASC, created_at ASC LOOP
    cnt := cnt + 1;
    expected := public.telemetry_chain_payload(last_hash, r.ts, r.api_endpoint, r.action, r.status);
    IF r.prev_hash IS DISTINCT FROM last_hash OR r.row_hash IS DISTINCT FROM expected THEN
      total_records := cnt;
      is_valid := false;
      broken_id := r.id;
      broken_ts := r.ts;
      broken_endpoint := r.api_endpoint;
      RETURN NEXT;
      RETURN;
    END IF;
    last_hash := r.row_hash;
  END LOOP;

  total_records := cnt;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_telemetry_chain() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telemetry_chain_payload(text, timestamptz, text, text, text) TO anon, authenticated;