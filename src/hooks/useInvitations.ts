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
      const fnName = "send-invitation-email";
      const payload = { email: input.email, name: input.name, token: input.token };

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!baseUrl || !anonKey) {
        const msg = "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY";
        console.error(`[SendInvitation] ${msg}`);
        throw new Error(msg);
      }

      const url = `${baseUrl}/functions/v1/${fnName}`;
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.error("[SendInvitation] Failed to get session:", sessionErr);
      }
      const accessToken = sessionData?.session?.access_token;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${accessToken || anonKey}`,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await res.text();

        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try {
            const errData = JSON.parse(responseText);
            errMsg = errData.error || errData.message || errMsg;
          } catch {
            errMsg = responseText || errMsg;
          }
          console.error(`[SendInvitation] Edge function error:`, {
            status: res.status,
            error: errMsg,
            functionName: fnName,
          });
          throw new Error(errMsg);
        }

        const result = JSON.parse(responseText);
        return result;
      } catch (err: any) {
        console.error(`[SendInvitation] Fetch error for ${fnName}:`, {
          message: err.message,
          functionName: fnName,
          url,
        });
        throw err;
      }
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
