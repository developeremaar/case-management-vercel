export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  created_at: string;
}

export interface Role {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
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
  updated_at: string;
  // Joined data
  organization?: Organization;
  branch?: Branch;
  department?: Department;
  role?: Role;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  city?: string;
  address?: string;
  contact_mobile?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
