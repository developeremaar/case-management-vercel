import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Membership } from "@/types/database";

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  module?: string;
}

interface ResolvedPermission extends Permission {
  is_granted: boolean;
}

function resolveEffectiveMembership(
  currentMembership: Membership | null,
  memberships: Membership[]
) {
  if (currentMembership?.is_active) return currentMembership;

  return (
    memberships.find((m) => m.is_active && m.is_primary) ||
    memberships.find((m) => m.is_active) ||
    null
  );
}

function resolveMembershipGrant(row: any): boolean | undefined {
  if (typeof row?.is_granted === "boolean") return row.is_granted;
  if (typeof row?.granted === "boolean") return row.granted;
  if (typeof row?.is_allowed === "boolean") return row.is_allowed;
  if (typeof row?.allowed === "boolean") return row.allowed;
  return undefined;
}

/**
 * Fetches permissions for the current membership by combining:
 * 1. role_permissions (base permissions from the role)
 * 2. membership_permissions (per-user overrides: grant or revoke)
 */
export function usePermissions() {
  const { user, memberships } = useAuth();
  const { currentMembership } = useOrganization();
  const effectiveMembership = resolveEffectiveMembership(currentMembership, memberships);
  const membershipId = effectiveMembership?.id;
  const roleId = effectiveMembership?.role_id;
  const roleCode = effectiveMembership?.role?.code;

  return useQuery<ResolvedPermission[]>({
    queryKey: ["permissions", membershipId, roleId],
    enabled: !!membershipId && !!roleId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      console.log("[Permissions] --- fetch start ---");
      console.log("[Permissions] current user id:", user?.id);
      console.log("[Permissions] current membership id:", membershipId);
      console.log("[Permissions] current role code:", roleCode);
      console.log("[Permissions] current role id:", roleId);

      // 1. Get role-based permissions
      const { data: rolePerms, error: roleErr } = await supabase
        .from("role_permissions")
        .select("permission:permissions(*)")
        .eq("role_id", roleId!);

      if (roleErr) {
        console.error("[Permissions] role_permissions error:", roleErr);
        throw roleErr;
      }

      // Build map from role permissions (all granted by default)
      const permMap = new Map<string, ResolvedPermission>();
      for (const rp of rolePerms || []) {
        const perm = (rp as any).permission as Permission;
        if (perm) {
          permMap.set(perm.code, { ...perm, is_granted: true });
        }
      }

      // 2. Get membership-level overrides
      const { data: memberPerms, error: memberErr } = await supabase
        .from("membership_permissions")
        .select("*, permission:permissions(*)")
        .eq("membership_id", membershipId!);

      if (memberErr) {
        console.error("[Permissions] membership_permissions error:", memberErr);
        // Non-fatal: continue with role permissions only
      } else {
        console.log("[Permissions] membership override row keys:", Object.keys((memberPerms || [])[0] || {}));

        for (const mp of memberPerms || []) {
          const perm = (mp as any).permission as Permission;
          const granted = resolveMembershipGrant(mp);

          if (perm && typeof granted === "boolean") {
            permMap.set(perm.code, { ...perm, is_granted: granted });
          } else if (perm) {
            console.warn("[Permissions] membership override skipped بسبب عدم العثور على حقل grant واضح:", {
              membershipId,
              permissionCode: perm.code,
              row: mp,
            });
          }
        }
      }

      const result = Array.from(permMap.values());
      console.log("[Permissions] loaded permission codes:", result.filter((p) => p.is_granted).map((p) => p.code));
      console.log("[Permissions] --- fetch end ---");
      return result;
    },
  });
}

/**
 * Returns a hasPermission(code) checker function.
 * While loading OR while membership isn't selected yet, treats as loading.
 */
export function useHasPermission() {
  const { user, memberships } = useAuth();
  const { currentMembership } = useOrganization();
  const effectiveMembership = resolveEffectiveMembership(currentMembership, memberships);
  const { data: permissions, isLoading: queryLoading } = usePermissions();
  const permissionCodes = permissions?.filter((permission) => permission.is_granted).map((permission) => permission.code) || [];

  // If membership isn't loaded yet, we're still loading even if the query says otherwise
  const isLoading = (!!user && memberships.length > 0 && !effectiveMembership) || queryLoading;

  const roleCode = effectiveMembership?.role?.code;
  const isOrgAdmin = roleCode === "org_admin";

  const hasPermission = (code: string): boolean => {
    if (isLoading) return false;
    if (isOrgAdmin) return true; // org_admin has full access
    return permissionCodes.includes(code);
  };

  const hasAnyPermission = (codes: string[]): boolean => {
    if (isLoading) return false;
    if (isOrgAdmin) return true; // org_admin has full access
    return codes.some((code) => permissionCodes.includes(code));
  };

  console.log("[useHasPermission] role:", roleCode, "isOrgAdmin:", isOrgAdmin, "permCodes:", permissionCodes);

  return {
    hasPermission,
    hasAnyPermission,
    isLoading,
    permissions,
    permissionCodes,
    currentMembership: effectiveMembership,
  };
}
