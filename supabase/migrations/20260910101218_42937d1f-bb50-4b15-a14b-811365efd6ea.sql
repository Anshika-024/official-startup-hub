CREATE TABLE IF NOT EXISTS public.startups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_name text NOT NULL,
  dpiit_number text,
  incorporation_date date,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.startups TO anon;
GRANT SELECT ON public.startups TO authenticated;
GRANT ALL ON public.startups TO service_role;

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Startups are publicly readable" ON public.startups FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON public.startups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.startups (startup_name, dpiit_number, incorporation_date, verification_status)
VALUES ('GreenSort Robotics Pvt Ltd', 'DIPP178432', '2021-06-14', 'verified');