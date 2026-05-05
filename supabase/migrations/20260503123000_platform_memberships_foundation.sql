-- Foundational platform-level access model for SaaS owner/admin roles.
-- Scope: introduce platform_memberships, platform access functions, and RLS integration.

-- 1) Table: platform_memberships
CREATE TABLE IF NOT EXISTS public.platform_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  revoked_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_memberships_role_check CHECK (
    role IN ('platform_owner', 'platform_admin', 'platform_support', 'platform_auditor')
  )
);

-- 2) Indexes and uniqueness constraints
CREATE INDEX IF NOT EXISTS idx_platform_memberships_user_id
  ON public.platform_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_platform_memberships_role
  ON public.platform_memberships (role);

CREATE INDEX IF NOT EXISTS idx_platform_memberships_is_active
  ON public.platform_memberships (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_memberships_one_active_per_user
  ON public.platform_memberships (user_id)
  WHERE is_active = true;

-- Ensure set_updated_at exists for fresh databases
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) Keep updated_at fresh
DROP TRIGGER IF EXISTS trg_platform_memberships_set_updated_at ON public.platform_memberships;
CREATE TRIGGER trg_platform_memberships_set_updated_at
BEFORE UPDATE ON public.platform_memberships
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4) Platform access functions
CREATE OR REPLACE FUNCTION public.user_is_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_memberships pm
    WHERE pm.user_id = auth.uid()
      AND pm.is_active = true
      AND pm.role = 'platform_owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_memberships pm
    WHERE pm.user_id = auth.uid()
      AND pm.is_active = true
      AND pm.role IN ('platform_owner', 'platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_platform_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_memberships pm
    WHERE pm.user_id = auth.uid()
      AND pm.is_active = true
      AND pm.role IN ('platform_owner', 'platform_admin', 'platform_support', 'platform_auditor')
  );
$$;

-- 5) RLS for platform_memberships
ALTER TABLE public.platform_memberships ENABLE ROW LEVEL SECURITY;

-- Remove legacy policies if re-running
DROP POLICY IF EXISTS platform_memberships_select_own ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_select_platform_admin ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_insert_platform_owner ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_update_platform_owner ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_delete_platform_owner ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_insert_service_role ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_update_service_role ON public.platform_memberships;
DROP POLICY IF EXISTS platform_memberships_delete_service_role ON public.platform_memberships;

-- 5.1 user can read own platform membership rows
CREATE POLICY platform_memberships_select_own
  ON public.platform_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5.2 platform owner/admin can read all
CREATE POLICY platform_memberships_select_platform_admin
  ON public.platform_memberships
  FOR SELECT
  TO authenticated
  USING (public.user_is_platform_admin());

-- 5.3 writes by platform_owner only for authenticated users
CREATE POLICY platform_memberships_insert_platform_owner
  ON public.platform_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_platform_owner());

CREATE POLICY platform_memberships_update_platform_owner
  ON public.platform_memberships
  FOR UPDATE
  TO authenticated
  USING (public.user_is_platform_owner())
  WITH CHECK (public.user_is_platform_owner());

CREATE POLICY platform_memberships_delete_platform_owner
  ON public.platform_memberships
  FOR DELETE
  TO authenticated
  USING (public.user_is_platform_owner());

-- 5.4 independent service_role write policies
CREATE POLICY platform_memberships_insert_service_role
  ON public.platform_memberships
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY platform_memberships_update_service_role
  ON public.platform_memberships
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY platform_memberships_delete_service_role
  ON public.platform_memberships
  FOR DELETE
  TO service_role
  USING (true);

-- 6) Organizations read access for platform owner/admin.
-- Keep existing member-read policy intact; add a permissive policy for platform admins.
DROP POLICY IF EXISTS organizations_select_platform_admin ON public.organizations;
CREATE POLICY organizations_select_platform_admin
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.user_is_platform_admin());
