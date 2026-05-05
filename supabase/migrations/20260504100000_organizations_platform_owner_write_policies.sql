-- Restrict organizations write access to platform_owner only.
-- Depends on: 20260503123000_platform_memberships_foundation.sql (defines public.user_is_platform_owner()).

-- Ensure no broad/legacy write policies remain.
DROP POLICY IF EXISTS "Authenticated can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can update organizations" ON public.organizations;
DROP POLICY IF EXISTS organizations_insert_platform_owner ON public.organizations;
DROP POLICY IF EXISTS organizations_update_platform_owner ON public.organizations;

CREATE POLICY organizations_insert_platform_owner
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_platform_owner());

CREATE POLICY organizations_update_platform_owner
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.user_is_platform_owner())
  WITH CHECK (public.user_is_platform_owner());
