create extension if not exists vector;

CREATE TABLE public.gfr_rules_kb (
  id uuid primary key default gen_random_uuid(),
  rule_reference text not null,
  content text not null,
  embedding vector(3072),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.gfr_rules_kb TO anon;
GRANT SELECT ON public.gfr_rules_kb TO authenticated;
GRANT ALL ON public.gfr_rules_kb TO service_role;

ALTER TABLE public.gfr_rules_kb ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules are publicly readable"
ON public.gfr_rules_kb FOR SELECT
USING (true);

CREATE POLICY "Anyone can attach embeddings"
ON public.gfr_rules_kb FOR UPDATE
USING (true) WITH CHECK (true);

GRANT UPDATE ON public.gfr_rules_kb TO anon;
GRANT UPDATE ON public.gfr_rules_kb TO authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gfr_rules_kb_updated_at
BEFORE UPDATE ON public.gfr_rules_kb
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX gfr_rules_kb_embedding_idx
  ON public.gfr_rules_kb using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_gfr_rules(
  query_embedding vector(3072),
  match_count int default 3
)
RETURNS TABLE (id uuid, rule_reference text, content text, similarity float)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  select k.id, k.rule_reference, k.content,
         1 - (k.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.gfr_rules_kb k
  where k.embedding is not null
  order by k.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_gfr_rules(vector, int) TO anon, authenticated, service_role;

INSERT INTO public.gfr_rules_kb (rule_reference, content) VALUES
('GFR 2017 Rule 166', 'Rule 166 of the General Financial Rules, 2017 permits procurement of goods without inviting quotations or bids, up to Rs. 25,000 per transaction, on the certificate of a competent authority that the item is of the required quality and the price is reasonable. Departments frequently rely on it, read with startup-friendly relaxations, to onboard innovative products for small-value pilots quickly, subject to recorded justification and audit trail.'),
('GFR 2017 Rule 144', 'Rule 144 of GFR 2017 sets the general principles of public procurement and empowers the procuring authority, with approval of the competent authority, to relax conditions of prior turnover and prior experience for Startups recognised by DPIIT and for Micro and Small Enterprises, subject to their meeting quality and technical specifications. This is the primary legal basis for allowing first-time startup vendors to bid for government contracts.'),
('Public Procurement Policy for MSEs 2012', 'The Public Procurement Policy for Micro and Small Enterprises Order, 2012 mandates that every central ministry, department and PSU procure a minimum of 25% of their annual value of goods and services from MSEs, including 4% from SC/ST-owned MSEs and 3% from women-owned MSEs. It also provides tender document cost exemption and price-matching purchase preference within an L1+15% band.'),
('Single-Source Justification Norms', 'Single tender enquiry or single-source procurement is permissible only where the item is proprietary, available from a single source, or required urgently, and must be supported by a recorded justification approved by the competent authority. The note on file must establish the uniqueness of the vendor, reasonableness of price, and absence of viable alternatives, and is subject to audit and vigilance scrutiny.'),
('CVC Vigilance Clearance Requirements', 'Central Vigilance Commission guidelines require that procurement decisions, especially limited or single tender awards, be transparent, documented and free of conflict of interest. Officers must obtain vigilance clearance where prescribed, avoid post-tender negotiations except with L1, keep an auditable file trail, and ensure no undue restriction of competition through tailored specifications.'),
('EMD Exemption for Recognised Startups', 'DPIIT-recognised startups are exempted from submitting Earnest Money Deposit or bid security in central government tenders, on production of their recognition certificate. Procuring entities may instead seek a Bid Security Declaration. The exemption lowers the working-capital barrier for early-stage vendors while retaining the right to debar bidders who withdraw bids or fail to execute contracts.'),
('GeM Startup Runway', 'Startup Runway on the Government e-Marketplace (GeM) is a dedicated storefront allowing DPIIT-recognised startups to list innovative products and services that do not fit existing GeM categories. Buyers can procure directly from these listings, and startups benefit from relaxed turnover, experience and EMD conditions, making it the most common route for early government pilots.'),
('MSME 45-Day Payment Rule', 'Under the MSMED Act, 2006, a buyer must pay a registered micro or small enterprise within the agreed period, which cannot exceed 45 days from the day of acceptance of goods or services; where there is no agreement, payment is due within 15 days. Delayed payment attracts compound interest at three times the RBI bank rate, and disputes go to the MSE Facilitation Council.'),
('GFR 2017 Rule 173 - Bid Conditions', 'Rule 173 of GFR 2017 governs the framing of tender enquiry and bid conditions. Specifications must be generic, broad-based and not tailored to a single brand, and eligibility conditions must be proportionate to the value and nature of the procurement. Relaxations granted to startups and MSEs under Rule 144 must be expressly stated in the tender document.'),
('Pilot Procurement and Proof-of-Concept Norms', 'Departments may sanction limited-value proof-of-concept or pilot deployments to validate emerging technologies before full-scale procurement. Good practice requires a defined pilot scope, capped budget, measurable success criteria, an isolated test environment, telemetry evidence retained for audit, and a documented decision note before converting a successful pilot into a competitive full-scale tender.');