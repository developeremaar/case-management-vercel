export interface Case {
  id: string;
  organization_id: string;
  case_number: string;
  title: string;
  subject?: string;
  description?: string;
  case_type_id?: string;
  case_source_id?: string;
  priority_id?: string;
  status_id?: string;
  branch_id?: string;
  department_id?: string;
  current_department_id?: string;
  current_owner_membership_id?: string;
  created_by_membership_id?: string;
  current_step_id?: string;
  beneficiary_id?: string;
  source_entity_name?: string;
  official_reference_number?: string;
  official_reference_date?: string;
  requested_amount?: number;
  approved_amount?: number;
  is_urgent?: boolean;
  is_confidential?: boolean;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  case_type?: LookupItem;
  case_source?: LookupItem;
  priority?: LookupItem;
  status?: LookupItem;
  department?: { id: string; name: string };
  current_department?: { id: string; name: string };
  branch?: { id: string; name: string };
  created_by_user?: { id: string; full_name: string; email: string } | null;
  current_owner_user?: { id: string; full_name: string; email: string } | null;
}

export interface LookupItem {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseFormData {
  title: string;
  subject?: string;
  description?: string;
  case_type_id?: string;
  case_source_id?: string;
  priority_id?: string;
  status_id?: string;
  department_id?: string;
  source_entity_name?: string;
  official_reference_number?: string;
  official_reference_date?: string;
  requested_amount?: number;
  beneficiary_full_name?: string;
  beneficiary_mobile?: string;
}
