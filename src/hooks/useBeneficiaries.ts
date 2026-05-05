import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface Beneficiary {
  id: string;
  organization_id: string;
  full_name: string;
  mobile: string;
  national_id?: string;
  gender?: string;
  birth_date?: string;
  city?: string;
  district?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryFormData {
  full_name: string;
  mobile: string;
  national_id?: string;
  gender?: string;
  birth_date?: string;
  city?: string;
  district?: string;
  address?: string;
  notes?: string;
}

function cleanOptional(value?: string) {
  return value?.trim() ? value.trim() : null;
}

export interface BeneficiaryStats {
  total_cases: number;
  open_cases: number;
  total_requested: number;
  total_approved: number;
  total_disbursed: number;
  last_support_date?: string;
}

export function useBeneficiaries(search?: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<Beneficiary[]>({
    queryKey: ["beneficiaries", orgId, search],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("beneficiaries")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (search?.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,mobile.ilike.%${search}%,national_id.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Beneficiary[];
    },
  });
}

export function useBeneficiary(id?: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<Beneficiary>({
    queryKey: ["beneficiary", id],
    enabled: !!orgId && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("id", id!)
        .eq("organization_id", orgId!)
        .single();
      if (error) throw error;
      return data as Beneficiary;
    },
  });
}

export function useBeneficiaryStats(beneficiaryId?: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery<BeneficiaryStats>({
    queryKey: ["beneficiary_stats", beneficiaryId],
    enabled: !!orgId && !!beneficiaryId,
    queryFn: async () => {
      // Get cases for this beneficiary
      const { data: cases, error } = await supabase
        .from("cases")
        .select("id, requested_amount, approved_amount, status:case_statuses(*), closed_at, created_at")
        .eq("beneficiary_id", beneficiaryId!)
        .eq("organization_id", orgId!);

      if (error) throw error;

      // Get closures for disbursed amounts
      const caseIds = (cases || []).map((c: any) => c.id);
      let totalDisbursed = 0;
      let lastSupportDate: string | undefined;

      if (caseIds.length > 0) {
        const { data: closures } = await supabase
          .from("case_closures")
          .select("final_amount, created_at")
          .in("case_id", caseIds);

        if (closures) {
          totalDisbursed = closures.reduce((sum: number, cl: any) => sum + (cl.final_amount || 0), 0);
          const sorted = closures.filter((c: any) => c.final_amount).sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          if (sorted.length > 0) lastSupportDate = sorted[0].created_at;
        }
      }

      const openCases = (cases || []).filter((c: any) => !c.closed_at).length;
      const totalRequested = (cases || []).reduce((sum: number, c: any) => sum + (c.requested_amount || 0), 0);
      const totalApproved = (cases || []).reduce((sum: number, c: any) => sum + (c.approved_amount || 0), 0);

      return {
        total_cases: (cases || []).length,
        open_cases: openCases,
        total_requested: totalRequested,
        total_approved: totalApproved,
        total_disbursed: totalDisbursed,
        last_support_date: lastSupportDate,
      };
    },
  });
}

export function useBeneficiaryCases(beneficiaryId?: string) {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return useQuery({
    queryKey: ["beneficiary_cases", beneficiaryId],
    enabled: !!orgId && !!beneficiaryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id, case_number, title, requested_amount, approved_amount, created_at, closed_at,
          case_type:case_types(*),
          status:case_statuses(*),
          priority:case_priorities(*)
        `)
        .eq("beneficiary_id", beneficiaryId!)
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useSearchBeneficiaries() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  return async (search: string) => {
    if (!orgId || !search.trim()) return [];
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("*")
      .eq("organization_id", orgId)
      .or(`full_name.ilike.%${search}%,mobile.ilike.%${search}%,national_id.ilike.%${search}%`)
      .limit(10);

    if (error) return [];
    return data as Beneficiary[];
  };
}

export function useCreateBeneficiary() {
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();

  return useMutation({
    mutationFn: async (formData: BeneficiaryFormData) => {
      const orgId = currentMembership?.organization_id;
      if (!orgId) throw new Error("لا توجد جهة محددة");

      if (!formData.mobile?.trim()) throw new Error("رقم الجوال مطلوب");
      if (!formData.full_name?.trim()) throw new Error("اسم المستفيد مطلوب");

      console.log("ORG ID:", orgId);
      console.log("FORM DATA:", formData);

      // Check for duplicate mobile
      const { data: existing } = await supabase
        .from("beneficiaries")
        .select("id")
        .eq("organization_id", orgId)
        .eq("mobile", formData.mobile.trim())
        .maybeSingle();

      if (existing) throw new Error("يوجد مستفيد بنفس رقم الجوال");

      const payload = {
        organization_id: orgId,
        full_name: formData.full_name.trim(),
        mobile: formData.mobile.trim(),
        national_id: cleanOptional(formData.national_id),
        gender: cleanOptional(formData.gender),
        birth_date: cleanOptional(formData.birth_date),
        city: cleanOptional(formData.city),
        district: cleanOptional(formData.district),
        address: cleanOptional(formData.address),
        notes: cleanOptional(formData.notes),
      };

      console.log("BENEFICIARY PAYLOAD", payload);

      const { data, error } = await supabase
        .from("beneficiaries")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Beneficiary insert error:", error);
        throw error;
      }
      return data as Beneficiary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
    },
  });
}

export function useUpdateBeneficiary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BeneficiaryFormData> }) => {
      const payload = {
        ...(data.full_name !== undefined ? { full_name: data.full_name.trim() } : {}),
        ...(data.mobile !== undefined ? { mobile: data.mobile.trim() } : {}),
        ...(data.national_id !== undefined ? { national_id: cleanOptional(data.national_id) } : {}),
        ...(data.gender !== undefined ? { gender: cleanOptional(data.gender) } : {}),
        ...(data.birth_date !== undefined ? { birth_date: cleanOptional(data.birth_date) } : {}),
        ...(data.city !== undefined ? { city: cleanOptional(data.city) } : {}),
        ...(data.district !== undefined ? { district: cleanOptional(data.district) } : {}),
        ...(data.address !== undefined ? { address: cleanOptional(data.address) } : {}),
        ...(data.notes !== undefined ? { notes: cleanOptional(data.notes) } : {}),
      };

      console.log("BENEFICIARY PAYLOAD", payload);

      const { data: updated, error } = await supabase
        .from("beneficiaries")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Beneficiary update error:", error);
        throw error;
      }
      return updated as Beneficiary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiary", data.id] });
    },
  });
}
