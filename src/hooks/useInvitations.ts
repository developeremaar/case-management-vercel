import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface InvitationRow {
  id: string;
  full_name: string;
  email?: string;
  mobile?: string;
  organization_id: string;
  branch_id?: string;
  department_id?: string;
  role_id: string;
  is_primary: boolean;
  is_active: boolean;
  notes?: string;
  status: string;
  invitation_token: string;
  invited_by_membership_id?: string;
  expires_at: string;
  created_at: string;
}

export function useInvitations() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<InvitationRow[]>({
    queryKey: ["invitations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as InvitationRow[];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  const { currentMembership } = useOrganization();

  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      email?: string;
      mobile?: string;
      organization_id: string;
      branch_id?: string;
      department_id?: string;
      role_id: string;
      is_primary?: boolean;
      is_active?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("user_invitations")
        .insert({
          full_name: input.full_name,
          email: input.email || null,
          mobile: input.mobile || null,
          organization_id: input.organization_id,
          branch_id: input.branch_id || null,
          department_id: input.department_id || null,
          role_id: input.role_id,
          is_primary: input.is_primary ?? false,
          is_active: input.is_active ?? true,
          notes: input.notes || null,
          status: "pending",
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invited_by_membership_id: currentMembership?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useSendInvitationEmail() {
  return useMutation({
    mutationFn: async (input: { email: string; name: string; token: string }) => {
      const { data, error } = await supabase.functions.invoke("send-invitation-email", {
        body: { email: input.email, name: input.name, token: input.token },
      });

      if (error) {
        throw new Error(error.message || "فشل استدعاء خدمة إرسال الدعوة");
      }

      return data ?? {};
    },
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("user_invitations")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}
