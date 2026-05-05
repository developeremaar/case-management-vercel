import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLog {
  id: string;
  case_id: string;
  action: string;
  membership_id?: string;
  organization_id: string;
  details?: Record<string, any>;
  created_at: string;
  actor_user?: { id: string; full_name: string } | null;
}

export interface CreateActionData {
  case_id: string;
  action_type: string;
  notes?: string;
  new_department_id?: string;
  new_status_id?: string;
  new_step_id?: string;
  auto_complete_status_id?: string;
  final_amount?: number | null;
}

export function useActivityLogs(caseId: string) {
  return useQuery<ActivityLog[]>({
    queryKey: ["activity_logs", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[ActivityLogs] Error:", error);
        throw error;
      }

      // Resolve actor names from membership_id
      const logs = data || [];
      const membershipIds = [...new Set(logs.map(l => l.membership_id).filter(Boolean))];
      let actorMap: Record<string, string> = {};

      if (membershipIds.length > 0) {
        const { data: members } = await supabase
          .from("memberships")
          .select("id, user_id")
          .in("id", membershipIds);

        if (members && members.length > 0) {
          const userIds = [...new Set(members.map(m => m.user_id))];
          const { data: users } = await supabase
            .from("users")
            .select("id, full_name")
            .in("id", userIds);

          const userMap: Record<string, string> = {};
          (users || []).forEach(u => { userMap[u.id] = u.full_name; });
          members.forEach(m => { actorMap[m.id] = userMap[m.user_id] || ""; });
        }
      }

      return logs.map((log: any) => ({
        ...log,
        actor_user: log.membership_id && actorMap[log.membership_id]
          ? { id: log.membership_id, full_name: actorMap[log.membership_id] }
          : null,
      })) as ActivityLog[];
    },
  });
}

export function useCreateCaseAction() {
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (actionData: CreateActionData) => {
      if (!currentMembership || !user) throw new Error("لا توجد جلسة نشطة");

      const { case_id, action_type, notes, new_department_id, new_status_id, new_step_id } = actionData;

      // First get current case data for old_values
      const { data: currentCase, error: caseError } = await supabase
        .from("cases")
        .select("current_department_id, status_id, current_step_id")
        .eq("id", case_id)
        .single();

      if (caseError) throw caseError;

      const meta: Record<string, any> = { notes };
      const updates: Record<string, any> = {};

      if (action_type === "transfer" && new_department_id) {
        meta.old_values = { current_department_id: currentCase.current_department_id };
        meta.new_values = { current_department_id: new_department_id };
        updates.current_department_id = new_department_id;
      } else if (action_type === "return" && new_department_id) {
        meta.old_values = { current_department_id: currentCase.current_department_id };
        meta.new_values = { current_department_id: new_department_id };
        updates.current_department_id = new_department_id;
      } else if ((action_type === "approve" || action_type === "reject") && new_status_id) {
        meta.old_values = { status_id: currentCase.status_id };
        meta.new_values = { status_id: new_status_id };
        updates.status_id = new_status_id;
      }

      // Handle workflow step transition
      if (new_step_id) {
        meta.old_values = { ...(meta.old_values || {}), current_step_id: currentCase.current_step_id };
        meta.new_values = { ...(meta.new_values || {}), current_step_id: new_step_id };
        updates.current_step_id = new_step_id;

        // Auto-set status to "مكتملة" when reaching closure step
        if (actionData.auto_complete_status_id) {
          meta.old_values.status_id = currentCase.status_id;
          meta.new_values.status_id = actionData.auto_complete_status_id;
          updates.status_id = actionData.auto_complete_status_id;
        }
      }

      // Update case if needed
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("cases")
          .update(updates)
          .eq("id", case_id);
        if (updateError) throw updateError;
      }

      // Insert case_closure record when reaching closure step
      if (new_step_id && actionData.auto_complete_status_id) {
        const { error: closureError } = await supabase
          .from("case_closures")
          .insert({
            case_id,
            closed_by_membership_id: currentMembership.id,
            closure_reason: notes || null,
            final_amount: actionData.final_amount ?? null,
            notes: notes || null,
          });
        if (closureError) console.error("Closure insert error:", closureError);
      }

      // Insert activity log
      const { error: logError } = await supabase
        .from("activity_logs")
        .insert({
          case_id,
          action: action_type,
          membership_id: currentMembership.id,
          organization_id: currentMembership.organization_id,
          details: meta as any,
        });

      if (logError) throw logError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activity_logs", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["case", variables.case_id] });
    },
  });
}
