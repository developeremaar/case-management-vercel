-- Harden RLS on previously unprotected tables (targeted and minimal)
-- Scope: beneficiary_contacts, membership_permissions, workflow_step_definitions
-- No schema/table/column additions.

-- =====================================================
-- 1) beneficiary_contacts
-- =====================================================
ALTER TABLE public.beneficiary_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beneficiary_contacts_select_member ON public.beneficiary_contacts;
DROP POLICY IF EXISTS beneficiary_contacts_insert_admin ON public.beneficiary_contacts;
DROP POLICY IF EXISTS beneficiary_contacts_update_admin ON public.beneficiary_contacts;
DROP POLICY IF EXISTS beneficiary_contacts_delete_admin ON public.beneficiary_contacts;

-- Read: members of the beneficiary's organization only
CREATE POLICY beneficiary_contacts_select_member
  ON public.beneficiary_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.beneficiaries b
      WHERE b.id = beneficiary_contacts.beneficiary_id
        AND user_has_org_membership(b.organization_id)
    )
  );

-- Write: org admins in the beneficiary's organization only
CREATE POLICY beneficiary_contacts_insert_admin
  ON public.beneficiary_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.beneficiaries b
      WHERE b.id = beneficiary_contacts.beneficiary_id
        AND user_is_org_admin(b.organization_id)
    )
  );

CREATE POLICY beneficiary_contacts_update_admin
  ON public.beneficiary_contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.beneficiaries b
      WHERE b.id = beneficiary_contacts.beneficiary_id
        AND user_is_org_admin(b.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.beneficiaries b
      WHERE b.id = beneficiary_contacts.beneficiary_id
        AND user_is_org_admin(b.organization_id)
    )
  );

CREATE POLICY beneficiary_contacts_delete_admin
  ON public.beneficiary_contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.beneficiaries b
      WHERE b.id = beneficiary_contacts.beneficiary_id
        AND user_is_org_admin(b.organization_id)
    )
  );

-- =====================================================
-- 2) membership_permissions
-- =====================================================
ALTER TABLE public.membership_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_permissions_select_admin ON public.membership_permissions;
DROP POLICY IF EXISTS membership_permissions_insert_admin ON public.membership_permissions;
DROP POLICY IF EXISTS membership_permissions_update_admin ON public.membership_permissions;
DROP POLICY IF EXISTS membership_permissions_delete_admin ON public.membership_permissions;

-- Read: org admins only, same organization as target membership
CREATE POLICY membership_permissions_select_admin
  ON public.membership_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.id = membership_permissions.membership_id
        AND user_is_org_admin(m.organization_id)
    )
  );

-- Write: org admins only, same organization as target membership
CREATE POLICY membership_permissions_insert_admin
  ON public.membership_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.id = membership_permissions.membership_id
        AND user_is_org_admin(m.organization_id)
    )
  );

CREATE POLICY membership_permissions_update_admin
  ON public.membership_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.id = membership_permissions.membership_id
        AND user_is_org_admin(m.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.id = membership_permissions.membership_id
        AND user_is_org_admin(m.organization_id)
    )
  );

CREATE POLICY membership_permissions_delete_admin
  ON public.membership_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.id = membership_permissions.membership_id
        AND user_is_org_admin(m.organization_id)
    )
  );

-- =====================================================
-- 3) workflow_step_definitions
-- =====================================================
-- This table is global in current schema (no organization_id and no org FK).
ALTER TABLE public.workflow_step_definitions ENABLE ROW LEVEL SECURITY;

-- Remove legacy broad policies if present
DROP POLICY IF EXISTS "Authenticated users can view step definitions" ON public.workflow_step_definitions;
DROP POLICY IF EXISTS "Authenticated users can insert step definitions" ON public.workflow_step_definitions;
DROP POLICY IF EXISTS "Authenticated users can update step definitions" ON public.workflow_step_definitions;
DROP POLICY IF EXISTS "Authenticated users can delete step definitions" ON public.workflow_step_definitions;
DROP POLICY IF EXISTS workflow_step_definitions_select_authenticated ON public.workflow_step_definitions;
DROP POLICY IF EXISTS workflow_step_definitions_write_service_role ON public.workflow_step_definitions;

-- Global read for signed-in users
CREATE POLICY workflow_step_definitions_select_authenticated
  ON public.workflow_step_definitions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Write reserved for platform/service role
CREATE POLICY workflow_step_definitions_write_service_role
  ON public.workflow_step_definitions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
