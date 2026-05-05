
-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view organizations" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update organizations" ON public.organizations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  mobile text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update users" ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update roles" ON public.roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Branches
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  city text,
  address text,
  contact_mobile text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update branches" ON public.branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update departments" ON public.departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6. Memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  branch_id uuid REFERENCES public.branches(id),
  department_id uuid REFERENCES public.departments(id),
  job_title text,
  is_primary boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view memberships" ON public.memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert memberships" ON public.memberships FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update memberships" ON public.memberships FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 7. Beneficiaries (extended fields)
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  national_id text,
  gender text,
  date_of_birth date,
  city text,
  district text,
  address text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view beneficiaries" ON public.beneficiaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert beneficiaries" ON public.beneficiaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update beneficiaries" ON public.beneficiaries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 8. Case Priorities
CREATE TABLE IF NOT EXISTS public.case_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view case_priorities" ON public.case_priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert case_priorities" ON public.case_priorities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update case_priorities" ON public.case_priorities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 9. Case Statuses
CREATE TABLE IF NOT EXISTS public.case_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view case_statuses" ON public.case_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert case_statuses" ON public.case_statuses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update case_statuses" ON public.case_statuses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 10. Case Sources
CREATE TABLE IF NOT EXISTS public.case_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view case_sources" ON public.case_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert case_sources" ON public.case_sources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update case_sources" ON public.case_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 11. Cases
CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_number text NOT NULL,
  title text NOT NULL,
  subject text,
  description text,
  case_type_id uuid REFERENCES public.case_types(id),
  case_source_id uuid REFERENCES public.case_sources(id),
  priority_id uuid REFERENCES public.case_priorities(id),
  status_id uuid REFERENCES public.case_statuses(id),
  branch_id uuid REFERENCES public.branches(id),
  department_id uuid REFERENCES public.departments(id),
  current_department_id uuid REFERENCES public.departments(id),
  beneficiary_id uuid REFERENCES public.beneficiaries(id),
  created_by_membership_id uuid REFERENCES public.memberships(id),
  current_owner_membership_id uuid REFERENCES public.memberships(id),
  current_step_id uuid REFERENCES public.workflow_steps(id),
  source_entity_name text,
  official_reference_number text,
  official_reference_date date,
  requested_amount numeric,
  approved_amount numeric,
  is_urgent boolean DEFAULT false,
  is_confidential boolean DEFAULT false,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view cases" ON public.cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cases" ON public.cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cases" ON public.cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 12. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES public.memberships(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 13. Case Closures
CREATE TABLE IF NOT EXISTS public.case_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  final_amount numeric,
  closure_reason text,
  notes text,
  closed_by_membership_id uuid REFERENCES public.memberships(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view case_closures" ON public.case_closures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert case_closures" ON public.case_closures FOR INSERT TO authenticated WITH CHECK (true);

-- Add foreign keys to workflow tables that reference new tables
ALTER TABLE public.workflow_templates ADD CONSTRAINT workflow_templates_case_type_id_fkey_real FOREIGN KEY (case_type_id) REFERENCES public.case_types(id) ON DELETE SET NULL;
