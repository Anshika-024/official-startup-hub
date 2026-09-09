CREATE TABLE public.procurement_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  need_description text NOT NULL,
  budget_range text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.procurement_needs TO anon, authenticated;
GRANT ALL ON public.procurement_needs TO service_role;
ALTER TABLE public.procurement_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Procurement needs are publicly readable" ON public.procurement_needs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.startup_pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_name text NOT NULL,
  pitch_text text NOT NULL,
  sector text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.startup_pitches TO anon, authenticated;
GRANT ALL ON public.startup_pitches TO service_role;
ALTER TABLE public.startup_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Startup pitches are publicly readable" ON public.startup_pitches FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.procurement_needs (department, need_description, budget_range) VALUES
('Municipal Corporation of Greater Mumbai', 'AI-based waste sorting for municipal corporation material recovery facilities, targeting 85% segregation accuracy on mixed dry waste streams.', '₹2.5 Cr – ₹4 Cr'),
('Department of Land Resources', 'Blockchain land record verification to create tamper-evident mutation history across 12 tehsil registries with legacy SOAP integration.', '₹5 Cr – ₹8 Cr'),
('Ministry of Agriculture & Farmers Welfare', 'Drone-based crop insurance survey for rapid loss assessment across 40,000 hectares under PMFBY claim cycles.', '₹3 Cr – ₹6 Cr'),
('Central Ground Water Board', 'Low-cost water quality IoT sensors for continuous nitrate, TDS and turbidity telemetry from 1,500 rural borewells.', '₹1.2 Cr – ₹2 Cr');

INSERT INTO public.startup_pitches (startup_name, pitch_text, sector) VALUES
('SortIQ Robotics', 'Computer-vision robotic arms that segregate mixed municipal dry waste at 92% accuracy on conveyor lines, deployed at three MRFs in Pune.', 'Waste Management / AI'),
('ChainRegistry Labs', 'Permissioned blockchain ledger for property mutation records with XSLT bridges into legacy SOAP registry systems used by state revenue departments.', 'GovTech / Blockchain'),
('AgriWing Aerials', 'DGCA-certified drone fleets performing multispectral crop damage assessment and automated PMFBY-compliant loss reports within 48 hours.', 'Agritech / Drones'),
('AquaSense Systems', 'Solar-powered IoT probes measuring nitrate, TDS and turbidity with LoRaWAN backhaul, priced under ₹9,000 per borewell node.', 'Water / IoT'),
('UrbanFlux Analytics', 'City dashboards aggregating traffic, air quality and utility telemetry into predictive municipal planning models.', 'Smart Cities / Analytics'),
('LedgerLite Fintech', 'Automated GST reconciliation and vendor payment workflows for small enterprises supplying to government departments.', 'Fintech / Compliance');