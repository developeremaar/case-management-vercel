import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";

export interface CaseClosure {
  id: string;
  case_id: string;
  final_amount: number | null;
  closure_reason: string | null;
  closure_summary: string | null;
  closure_decision: string | null;
  closed_by_membership_id: string | null;
  created_at: string;
  closed_by_user?: { full_name: string } | null;
}

export interface CloseCaseData {
  case_id: string;
  closure_reason: string;
  notes?: string;
  final_amount?: number | null;
  reference_number?: string;
  disbursement_date?: string;
  executing_entity?: string;
}

export function useCaseClosure(caseId?: string) { /* unchanged logic */
  return useQuery<CaseClosure | null>({
    queryKey: ["case_closure", caseId], enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("case_closures").select("*").eq("case_id", caseId!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as CaseClosure;
    },
  });
}

export function useCloseCase() {
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CloseCaseData) => {
      if (!currentMembership || !user) throw new Error("لا توجد جلسة نشطة");
      const { case_id, closure_reason, final_amount, reference_number, disbursement_date, executing_entity } = data;

      const summary = [data.notes, reference_number && `رقم المرجع: ${reference_number}`, disbursement_date && `تاريخ الصرف: ${disbursement_date}`, executing_entity && `جهة التنفيذ: ${executing_entity}`].filter(Boolean).join("\n");

      const { error: closureError } = await supabase.from("case_closures").insert({
        case_id,
        final_amount: final_amount ?? null,
        closure_reason: closure_reason || null,
        closure_summary: summary || null,
        closure_decision: "approved",
        closed_by_membership_id: currentMembership.id,
      });
      if (closureError) throw new Error("فشل حفظ سجل الإغلاق: " + closureError.message);

      const { data: statuses } = await supabase.from("case_statuses").select("id, code, name").eq("organization_id", currentMembership.organization_id);
      const closedStatus = statuses?.find((s) => s.code === "completed" || s.code === "closed" || s.name === "مكتملة" || s.name === "مغلقة");
      const caseUpdates: Record<string, any> = { closed_at: new Date().toISOString() };
      if (closedStatus) caseUpdates.status_id = closedStatus.id;
      const { error: caseUpdateError } = await supabase.from("cases").update(caseUpdates).eq("id", case_id);
      if (caseUpdateError) throw new Error("فشل تحديث الحالة: " + caseUpdateError.message);

      await supabase.from("activity_logs").insert({
        organization_id: currentMembership.organization_id,
        case_id,
        entity_type: "case",
        entity_id: case_id,
        action: "close_case",
        actor_user_id: user.id,
        actor_membership_id: currentMembership.id,
        old_values_json: null,
        new_values_json: caseUpdates,
        meta_json: { closure_reason, final_amount: final_amount ?? null, closure_summary: summary || null },
      });

      return { success: true };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["case", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["case_closure", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs", variables.case_id] });
    },
  });
}
