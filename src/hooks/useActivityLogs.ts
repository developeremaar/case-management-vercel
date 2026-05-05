import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLog {
  id: string;
  case_id: string | null;
  action: string;
  actor_membership_id?: string | null;
  organization_id: string;
  old_values_json?: Record<string, any> | null;
  new_values_json?: Record<string, any> | null;
  meta_json?: Record<string, any> | null;
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

      if (error) throw error;

      const logs = data || [];
      const membershipIds = [...new Set(logs.map((l) => l.actor_membership_id).filter(Boolean))] as string[];
      const actorMap: Record<string, string> = {};

      if (membershipIds.length > 0) {
        const { data: members } = await supabase.from("memberships").select("id, user_id").in("id", membershipIds);
        if (members?.length) {
          const userIds = [...new Set(members.map((m) => m.user_id))];
          const { data: users } = await supabase.from("users").select("id, full_name").in("id", userIds);
          const userMap: Record<string, string> = {};
          (users || []).forEach((u) => { userMap[u.id] = u.full_name; });
          members.forEach((m) => { actorMap[m.id] = userMap[m.user_id] || ""; });
        }
      }

      return logs.map((log: any) => ({
        ...log,
        actor_user: log.actor_membership_id && actorMap[log.actor_membership_id]
          ? { id: log.actor_membership_id, full_name: actorMap[log.actor_membership_id] }
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

      const { data: currentCase, error: caseError } = await supabase
        .from("cases")
        .select("current_department_id, status_id, current_step_id")
        .eq("id", case_id)
        .single();
      if (caseError) throw caseError;

      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const updates: Record<string, any> = {};

      if ((action_type === "transfer" || action_type === "return") && new_department_id) {
        oldValues.current_department_id = currentCase.current_department_id;
        newValues.current_department_id = new_department_id;
        updates.current_department_id = new_department_id;
      } else if ((action_type === "approve" || action_type === "reject") && new_status_id) {
        oldValues.status_id = currentCase.status_id;
        newValues.status_id = new_status_id;
        updates.status_id = new_status_id;
      }

      if (new_step_id) {
        oldValues.current_step_id = currentCase.current_step_id;
        newValues.current_step_id = new_step_id;
        updates.current_step_id = new_step_id;
        if (actionData.auto_complete_status_id) {
          oldValues.status_id = currentCase.status_id;
          newValues.status_id = actionData.auto_complete_status_id;
          updates.status_id = actionData.auto_complete_status_id;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from("cases").update(updates).eq("id", case_id);
        if (updateError) throw updateError;
      }

      if (new_step_id && actionData.auto_complete_status_id) {
        const { error: closureError } = await supabase.from("case_closures").insert({
          case_id,
          closed_by_membership_id: currentMembership.id,
          closure_reason: notes || null,
          closure_summary: notes || "تم إغلاق الحالة",
          final_amount: actionData.final_amount ?? null,
          closure_decision: null,
        });
        if (closureError) console.error("Closure insert error:", closureError);
      }

      const { error: logError } = await supabase.from("activity_logs").insert({
        organization_id: currentMembership.organization_id,
        case_id,
        entity_type: "case",
        entity_id: case_id,
        action: action_type,
        actor_user_id: user.id,
        actor_membership_id: currentMembership.id,
        old_values_json: Object.keys(oldValues).length ? oldValues : null,
        new_values_json: Object.keys(newValues).length ? newValues : null,
        meta_json: {
          notes: notes || null,
          action_type,
          new_department_id: new_department_id || null,
          new_status_id: new_status_id || null,
          new_step_id: new_step_id || null,
        },
      });

      if (logError) throw new Error("فشل تسجيل الإجراء في السجل: " + logError.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activity_logs", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["case", variables.case_id] });
    },
  });
}
