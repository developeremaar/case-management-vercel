import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Case, CaseFormData, LookupItem } from "@/types/cases";
import { useWorkflowSteps, getFirstStep } from "@/hooks/useWorkflowSteps";

export function useCase(caseId: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<Case>({
    queryKey: ["case", caseId],
    enabled: !!orgId && !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select(`
          *,
          case_type:case_types(*),
          case_source:case_sources(*),
          priority:case_priorities(*),
          status:case_statuses(*),
          department:departments!cases_department_id_fkey(*),
          current_department:departments!cases_current_department_id_fkey(*),
          branch:branches(*),
          created_by_membership:memberships!cases_created_by_membership_id_fkey(id, user:users(*)),
          current_owner_membership:memberships!cases_current_owner_membership_id_fkey(id, user:users(*))
        `)
        .eq("id", caseId)
        .eq("organization_id", orgId!)
        .single();

      if (error) throw error;
      // Flatten user data
      const result = data as any;
      return {
        ...result,
        created_by_user: result.created_by_membership?.user || null,
        current_owner_user: result.current_owner_membership?.user || null,
      } as Case;
    },
  });
}

export function useCases(search?: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<Case[]>({
    queryKey: ["cases", orgId, search],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("cases")
        .select(`
          *,
          case_type:case_types(*),
          case_source:case_sources(*),
          priority:case_priorities(*),
          status:case_statuses(*),
          department:departments!cases_department_id_fkey(*),
          current_department:departments!cases_current_department_id_fkey(*)
        `)
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (search?.trim()) {
        query = query.or(`title.ilike.%${search}%,case_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Case[];
    },
  });
}

export function useCaseLookups() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  const fetchLookup = async (table: string) => {
    console.log(`[Lookup] Fetching ${table} for org:`, orgId);
    let query = supabase
      .from(table)
      .select("*")
      .eq("organization_id", orgId!)
      .order("name");

    // Only filter by is_active if the table supports it
    // Some tables may not have this column
    const { data, error } = await query;
    if (error) {
      console.error(`[Lookup] Error fetching ${table}:`, error);
      throw error;
    }
    console.log(`[Lookup] ${table} returned ${data?.length ?? 0} rows:`, data);
    // Filter active items client-side to avoid errors if column doesn't exist
    const filtered = data?.filter((item: any) => item.is_active !== false) ?? [];
    return filtered as LookupItem[];
  };

  const caseTypes = useQuery({ queryKey: ["case_types", orgId], enabled: !!orgId, queryFn: () => fetchLookup("case_types") });
  const caseSources = useQuery({ queryKey: ["case_sources", orgId], enabled: !!orgId, queryFn: () => fetchLookup("case_sources") });
  const priorities = useQuery({ queryKey: ["case_priorities", orgId], enabled: !!orgId, queryFn: () => fetchLookup("case_priorities") });
  const statuses = useQuery({ queryKey: ["case_statuses", orgId], enabled: !!orgId, queryFn: () => fetchLookup("case_statuses") });
  const departments = useQuery({ queryKey: ["departments_lookup", orgId], enabled: !!orgId, queryFn: () => fetchLookup("departments") });

  return { caseTypes, caseSources, priorities, statuses, departments };
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();
  const { data: workflowSteps } = useWorkflowSteps();

  return useMutation({
    mutationFn: async (formData: CaseFormData) => {
      const orgId = currentMembership?.organization_id;
      if (!orgId || !currentMembership) throw new Error("لا توجد جهة محددة");

      const mobile = formData.beneficiary_mobile?.trim();
      if (!mobile) {
        throw new Error("رقم جوال المستفيد مطلوب");
      }

      console.log("[CreateCase] Starting case creation for org:", orgId);
      console.log("[CreateCase] Beneficiary mobile:", mobile, "name:", formData.beneficiary_full_name);

      // 1) Resolve beneficiary
      let beneficiaryId: string;

      // Search for existing beneficiary by mobile in same org
      const { data: existing, error: searchErr } = await supabase
        .from("beneficiaries")
        .select("id")
        .eq("organization_id", orgId)
        .eq("mobile", mobile)
        .maybeSingle();

      if (searchErr) {
        console.error("[CreateCase] Beneficiary search failed:", { error: searchErr, mobile, orgId });
        throw new Error("فشل البحث عن المستفيد: " + searchErr.message);
      }

      if (existing) {
        beneficiaryId = existing.id;
        console.log("[CreateCase] Found existing beneficiary:", beneficiaryId);
      } else {
        // Create new beneficiary
        const { data: newBen, error: createErr } = await supabase
          .from("beneficiaries")
          .insert({
            organization_id: orgId,
            full_name: formData.beneficiary_full_name || "مستفيد",
            mobile: mobile,
          })
          .select("id")
          .single();

        if (createErr) {
          console.error("[CreateCase] Beneficiary creation failed:", { error: createErr, mobile, orgId });
          throw new Error("فشل إنشاء المستفيد: " + createErr.message);
        }
        beneficiaryId = newBen.id;
        console.log("[CreateCase] Created new beneficiary:", beneficiaryId);
      }

      // 2) Create the case
      const caseNumber = `CASE-${Date.now()}`;
      const firstStep = workflowSteps?.length ? getFirstStep(workflowSteps) : null;

      // Remove beneficiary form fields before inserting into cases
      const { beneficiary_full_name, beneficiary_mobile, ...caseFields } = formData;

      const casePayload = {
        ...caseFields,
        organization_id: orgId,
        branch_id: currentMembership.branch_id,
        case_number: caseNumber,
        created_by_membership_id: currentMembership.id,
        current_owner_membership_id: currentMembership.id,
        current_department_id: caseFields.department_id,
        requested_amount: caseFields.requested_amount || null,
        current_step_id: firstStep?.id || null,
        beneficiary_id: beneficiaryId,
      };

      console.log("[CreateCase] Inserting case with beneficiary_id:", beneficiaryId);

      const { data, error } = await supabase
        .from("cases")
        .insert(casePayload)
        .select()
        .single();

      if (error) {
        console.error("[CreateCase] Case insert failed:", { error, beneficiary_id: beneficiaryId });
        throw error;
      }
      console.log("[CreateCase] Case created successfully:", data.id, "beneficiary_id:", beneficiaryId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
