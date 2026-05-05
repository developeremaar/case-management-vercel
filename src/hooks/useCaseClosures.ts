import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface CaseClosure {
  id: string;
  case_id: string;
  final_amount: number | null;
  closure_reason: string | null;
  notes: string | null;
  closed_by_membership_id: string | null;
  created_at: string;
  closed_by_user?: { full_name: string } | null;
}

export interface CloseCaseData {
  case_id: string;
  closure_reason: string;
  notes?: string;
  final_amount?: number | null;
  /** Extra info stored as JSON in `notes` field */
  reference_number?: string;
  disbursement_date?: string;
  executing_entity?: string;
}

export function useCaseClosure(caseId?: string) {
  return useQuery<CaseClosure | null>({
    queryKey: ["case_closure", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_closures")
        .select("*")
        .eq("case_id", caseId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[CaseClosure] Fetch error:", error);
        throw error;
      }
      if (!data) return null;

      // Resolve closed_by user name
      let closedByUser: { full_name: string } | null = null;
      if (data.closed_by_membership_id) {
        const { data: membership } = await supabase
          .from("memberships")
          .select("user_id")
          .eq("id", data.closed_by_membership_id)
          .single();
        if (membership) {
          const { data: user } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", membership.user_id)
            .single();
          if (user) closedByUser = { full_name: user.full_name };
        }
      }

      return { ...data, closed_by_user: closedByUser } as CaseClosure;
    },
  });
}

export function useCloseCase() {
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();

  return useMutation({
    mutationFn: async (data: CloseCaseData) => {
      if (!currentMembership) throw new Error("لا توجد جلسة نشطة");

      const { case_id, closure_reason, final_amount, reference_number, disbursement_date, executing_entity } = data;

      console.log("[CloseCase] Starting closure for case:", case_id);

      // Build structured notes JSON with extra info
      const notesObj: Record<string, any> = {};
      if (data.notes) notesObj.text = data.notes;
      if (reference_number) notesObj.reference_number = reference_number;
      if (disbursement_date) notesObj.disbursement_date = disbursement_date;
      if (executing_entity) notesObj.executing_entity = executing_entity;
      const notesStr = Object.keys(notesObj).length > 0 ? JSON.stringify(notesObj) : null;

      // 1. Insert case_closures record
      console.log("[CloseCase] Inserting case_closures:", { case_id, final_amount, closure_reason });
      const { error: closureError } = await supabase
        .from("case_closures")
        .insert({
          case_id,
          final_amount: final_amount ?? null,
          closure_reason: closure_reason || null,
          notes: notesStr,
          closed_by_membership_id: currentMembership.id,
        });

      if (closureError) {
        console.error("[CloseCase] case_closures insert error:", closureError);
        throw new Error("فشل حفظ سجل الإغلاق: " + closureError.message);
      }

      // 2. Find the "completed/closed" status
      const { data: statuses } = await supabase
        .from("case_statuses")
        .select("id, code, name")
        .eq("organization_id", currentMembership.organization_id);

      const closedStatus = statuses?.find(
        (s) => s.code === "completed" || s.code === "closed" || s.name === "مكتملة" || s.name === "مغلقة"
      );

      // 3. Update cases table
      const caseUpdates: Record<string, any> = {
        closed_at: new Date().toISOString(),
      };
      if (closedStatus) {
        caseUpdates.status_id = closedStatus.id;
      }

      console.log("[CloseCase] Updating case:", caseUpdates);
      const { error: caseUpdateError } = await supabase
        .from("cases")
        .update(caseUpdates)
        .eq("id", case_id);

      if (caseUpdateError) {
        console.error("[CloseCase] cases update error:", caseUpdateError);
        throw new Error("فشل تحديث الحالة: " + caseUpdateError.message);
      }

      // 4. Insert activity log
      const logDetails: Record<string, any> = {
        action_type: "close_case",
        closure_reason,
        final_amount: final_amount ?? null,
        reference_number: reference_number || null,
        closed_by_membership_id: currentMembership.id,
      };

      console.log("[CloseCase] Inserting activity_log:", logDetails);
      const { error: logError } = await supabase
        .from("activity_logs")
        .insert({
          case_id,
          action: "close_case",
          membership_id: currentMembership.id,
          organization_id: currentMembership.organization_id,
          details: logDetails,
        });

      if (logError) {
        console.error("[CloseCase] activity_logs insert error:", logError);
        // Don't throw - closure already succeeded
      }

      return { success: true };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["case", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["case_closure", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs", variables.case_id] });
      queryClient.invalidateQueries({ queryKey: ["beneficiary_stats"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiary_cases"] });
    },
  });
}
