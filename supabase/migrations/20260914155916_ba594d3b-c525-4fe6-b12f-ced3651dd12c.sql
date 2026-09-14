-- Roles enum + separate role table (never store roles on profiles)
CREATE TYPE public.app_role AS ENUM ('official', 'startup');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  startup_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.my_startup_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT startup_name FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_startup_name() TO authenticated, service_role;

-- Seed demo profiles + roles for the two demo accounts
INSERT INTO public.profiles (id, email, display_name, startup_name)
SELECT u.id, u.email,
       CASE WHEN u.email = 'official@gempilot.gov.in' THEN 'Dept. Official (Demo)' ELSE 'GreenSort Robotics (Demo)' END,
       CASE WHEN u.email = 'official@gempilot.gov.in' THEN NULL ELSE 'GreenSort Robotics' END
FROM auth.users u
WHERE u.email IN ('official@gempilot.gov.in', 'vendor@greensort.in')
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      startup_name = EXCLUDED.startup_name;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN u.email = 'official@gempilot.gov.in' THEN 'official'::public.app_role ELSE 'startup'::public.app_role END
FROM auth.users u
WHERE u.email IN ('official@gempilot.gov.in', 'vendor@greensort.in')
ON CONFLICT (user_id, role) DO NOTHING;

-- payment_milestones: officials only
DROP POLICY IF EXISTS "Payment milestones are publicly readable" ON public.payment_milestones;
REVOKE SELECT ON public.payment_milestones FROM anon;
CREATE POLICY "Officials can read payment milestones"
  ON public.payment_milestones FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'official'));

-- startups: officials see all, a startup account sees only its own record
DROP POLICY IF EXISTS "Startups are publicly readable" ON public.startups;
REVOKE SELECT ON public.startups FROM anon;
CREATE POLICY "Officials can read all startup records"
  ON public.startups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'official'));
CREATE POLICY "Startup accounts can read their own record"
  ON public.startups FOR SELECT TO authenticated
  USING (startup_name = public.my_startup_name());

-- Public transparency page needs only the aggregate committed budget, no invoice detail.
CREATE OR REPLACE FUNCTION public.public_pilot_budget()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0) FROM public.payment_milestones
$$;

GRANT EXECUTE ON FUNCTION public.public_pilot_budget() TO anon, authenticated, service_role;