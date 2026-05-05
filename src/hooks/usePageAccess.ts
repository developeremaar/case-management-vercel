import { useHasPermission } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { resolvePagePermissionCode } from "@/lib/pagePermissions";

/**
 * Unified page access hook.
 * Returns { isLoading, canAccess } for a given permission code.
 * While loading, canAccess is undefined (neither granted nor denied).
 */
export function usePageAccess(permissionCode: string) {
  const { user } = useAuth();
  const { currentMembership, hasAnyPermission, isLoading, permissionCodes } = useHasPermission();
  const resolved = resolvePagePermissionCode(permissionCode, permissionCodes);

  const roleCode = currentMembership?.role?.code;
  const canAccess = isLoading ? undefined : hasAnyPermission(resolved.candidates);

  useEffect(() => {
    if (isLoading) return;

    console.log("[PageAccess] ---");
    console.log("[PageAccess] current user id:", user?.id);
    console.log("[PageAccess] current membership id:", currentMembership?.id);
    console.log("[PageAccess] current role code:", roleCode);
    console.log("[PageAccess] loaded permission codes:", permissionCodes);
    console.log("[PageAccess] requested page key:", permissionCode);
    console.log("[PageAccess] candidate permission codes:", resolved.candidates);
    console.log("[PageAccess] required permission code:", resolved.requiredCode);
    console.log("[PageAccess] result:", canAccess);
    console.log("[PageAccess] ---");
  }, [canAccess, currentMembership?.id, isLoading, permissionCode, permissionCodes, resolved.candidates, resolved.requiredCode, roleCode, user?.id]);

  return {
    isLoading,
    canAccess,
    requiredPermissionCode: resolved.requiredCode,
    candidatePermissionCodes: resolved.candidates,
    permissionCodes,
  };
}
