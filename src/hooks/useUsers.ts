import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface UserRow {
  id: string;
  full_name: string;
  mobile?: string;
  email?: string;
  is_active?: boolean;
  avatar_url?: string;
  created_at: string;
  membership_count?: number;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  branch_id?: string;
  department_id?: string;
  job_title?: string;
  is_primary?: boolean;
  is_active: boolean;
  created_at: string;
  organization?: { id: string; name: string };
  branch?: { id: string; name: string };
  department?: { id: string; name: string };
  role?: { id: string; name: string; code: string };
}

export function useUsers() {
  return useQuery<UserRow[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get membership counts
      const { data: counts, error: cErr } = await supabase
        .from("memberships")
        .select("user_id");

      if (cErr) console.error(cErr);

      const countMap = new Map<string, number>();
      for (const m of counts || []) {
        countMap.set(m.user_id, (countMap.get(m.user_id) || 0) + 1);
      }

      return (users || []).map((u) => ({
        ...u,
        membership_count: countMap.get(u.id) || 0,
      }));
    },
  });
}

export function useUserMemberships(userId: string | null) {
  return useQuery<MembershipRow[]>({
    queryKey: ["user-memberships", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select(
          "*, organization:organizations(id, name), branch:branches(id, name), department:departments(id, name), role:roles(id, name, code)"
        )
        .eq("user_id", userId!);

      if (error) throw error;
      return (data || []) as MembershipRow[];
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      mobile?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("users")
        .insert({
          full_name: input.full_name,
          mobile: input.mobile || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useCreateMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      organization_id: string;
      role_id: string;
      branch_id?: string;
      department_id?: string;
      is_primary?: boolean;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("memberships")
        .insert({
          user_id: input.user_id,
          organization_id: input.organization_id,
          role_id: input.role_id,
          branch_id: input.branch_id || null,
          department_id: input.department_id || null,
          is_primary: input.is_primary ?? false,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["user-memberships", vars.user_id] });
    },
  });
}

export function useUpdateMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      user_id: string;
      organization_id: string;
      role_id: string;
      branch_id?: string;
      department_id?: string;
      is_primary?: boolean;
      is_active?: boolean;
    }) => {
      // If setting as primary, unset other memberships first
      if (input.is_primary) {
        await supabase
          .from("memberships")
          .update({ is_primary: false })
          .eq("user_id", input.user_id)
          .neq("id", input.id);
      }

      const { data, error } = await supabase
        .from("memberships")
        .update({
          organization_id: input.organization_id,
          role_id: input.role_id,
          branch_id: input.branch_id || null,
          department_id: input.department_id || null,
          is_primary: input.is_primary ?? false,
          is_active: input.is_active ?? true,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["user-memberships", vars.user_id] });
    },
  });
}

export function useToggleMembershipActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; user_id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("memberships")
        .update({ is_active: input.is_active })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["user-memberships", vars.user_id] });
    },
  });
}

export function useLookups() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  const organizations = useQuery({
    queryKey: ["lookup-organizations"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name");
      return data || [];
    },
  });

  const branches = useQuery({
    queryKey: ["lookup-branches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, organization_id");
      return data || [];
    },
  });

  const departments = useQuery({
    queryKey: ["lookup-departments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("departments")
        .select("id, name, organization_id");
      return data || [];
    },
  });

  const roles = useQuery({
    queryKey: ["lookup-roles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("roles")
        .select("id, name, code, organization_id");
      return data || [];
    },
  });

  return { organizations, branches, departments, roles };
}
