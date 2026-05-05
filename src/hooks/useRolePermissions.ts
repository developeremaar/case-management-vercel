import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface RoleRow {
  id: string;
  name: string;
  code: string;
  organization_id: string;
}

export interface PermissionRow {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export function useRoles() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<RoleRow[]>({
    queryKey: ["admin-roles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      console.log("[useRoles] Fetching roles for org:", orgId);
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, code, organization_id")
        .eq("organization_id", orgId!);
      if (error) {
        console.error("[useRoles] Error:", error);
        throw error;
      }
      console.log("[useRoles] Result:", data);
      return (data as any[] || []) as RoleRow[];
    },
  });
}

export function useAllPermissions() {
  return useQuery<PermissionRow[]>({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("id, code, name, description")
        .order("code");
      if (error) {
        console.error("[useAllPermissions] Error:", error);
        throw error;
      }
      return (data as any[] || []) as PermissionRow[];
    },
  });
}

export function useRolePermissionIds(roleId: string | null) {
  return useQuery<string[]>({
    queryKey: ["role-permission-ids", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", roleId!);
      if (error) {
        console.error("[useRolePermissionIds] Error:", error);
        throw error;
      }
      return ((data as any[]) || []).map((r: any) => r.permission_id);
    },
  });
}

export function useGrantRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role_id: string; permission_id: string }) => {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ role_id: input.role_id, permission_id: input.permission_id });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["role-permission-ids", vars.role_id] });
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}

export function useRevokeRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role_id: string; permission_id: string }) => {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", input.role_id)
        .eq("permission_id", input.permission_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["role-permission-ids", vars.role_id] });
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}
