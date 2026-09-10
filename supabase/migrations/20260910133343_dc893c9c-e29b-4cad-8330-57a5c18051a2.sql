CREATE TABLE public.payment_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_name text NOT NULL,
  milestone_description text NOT NULL,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_milestones TO anon;
GRANT SELECT ON public.payment_milestones TO authenticated;
GRANT ALL ON public.payment_milestones TO service_role;

ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment milestones are publicly readable"
ON public.payment_milestones FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_payment_milestones_updated_at
BEFORE UPDATE ON public.payment_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_milestones (startup_name, milestone_description, invoice_date, due_date, status, amount) VALUES
('EcoSort Robotics', 'Phase 1 deployment - 4 municipal wards', (CURRENT_DATE - 60), (CURRENT_DATE - 60) + 45, 'overdue', 1850000),
('TerraChain Systems', 'Land record pilot - integration milestone', (CURRENT_DATE - 41), (CURRENT_DATE - 41) + 45, 'pending', 920000),
('AgriDrone Analytics', 'Crop survey sortie batch 2', (CURRENT_DATE - 20), (CURRENT_DATE - 20) + 45, 'pending', 640000),
('MedLog Chain', 'Cold-chain sensor rollout - final', (CURRENT_DATE - 75), (CURRENT_DATE - 75) + 45, 'paid', 1275000);