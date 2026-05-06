import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePageAccess } from "@/hooks/usePageAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { OrganizationOverviewSection } from "@/components/settings/OrganizationOverviewSection";
import { BranchesDepartmentsSection } from "@/components/settings/BranchesDepartmentsSection";
import {
  Loader2, Settings as SettingsIcon, Plus, Pencil, Trash2,
  ArrowUp, ArrowDown, GitBranch, ChevronLeft, Shield, ListOrdered,
  FileText, Eye, CheckCircle2, AlertCircle, RotateCcw, ArrowRightLeft,
  Clock, Zap, Users, Building2, Copy, PackagePlus,
} from "lucide-react";

// ── Types ──
interface WorkflowTemplate {
  id: string;
  name: string;
  code: string;
  case_type_id: string | null;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  name: string;
  code: string;
  step_order: number;
  step_type?: string;
  department_id?: string | null;
  is_required?: boolean;
  allow_parallel_approvals?: boolean;
  allow_return_for_info?: boolean;
  auto_move_on_success?: boolean;
  is_active?: boolean;
}

interface StepDefinition {
  id: string;
  code: string;
  name: string;
  step_type: string;
  is_active: boolean;
}

interface CaseType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  requires_amount: boolean;
  requires_beneficiary: boolean;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
}

interface RoleRow {
  id: string;
  name: string;
  code: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  commercial_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  address: string | null;
  country_code: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BranchRow {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  city: string | null;
  address: string | null;
  contact_mobile: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrganizationDepartmentRow {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CaseSourceRow {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface CasePriorityRow {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface CaseStatusRow {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  color: string | null;
  is_terminal: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationSettingsRow {
  id: string;
  organization_id: string;
  has_branches: boolean;
  case_number_prefix: string | null;
  default_locale: string | null;
  allow_external_portal: boolean;
  require_official_reference: boolean;
  require_source_reference: boolean;
  allow_parallel_approvals: boolean;
  allow_multi_department_assignment: boolean;
  default_case_visibility: string | null;
  created_at: string;
  updated_at: string;
}

interface StepAssignee {
  id: string;
  workflow_step_id: string;
  assignment_type: string;
  action_type: string;
  role_id: string | null;
  department_id: string | null;
  membership_id: string | null;
}

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  role: "دور",
  department: "قسم",
  user: "مستخدم",
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  execute: "تنفيذ",
  approve: "اعتماد",
  return: "إرجاع",
  edit: "تعديل",
  assign: "تحويل",
  close: "إغلاق",
};

// ── Step type labels (must match DB constraint) ──
const STEP_TYPE_LABELS: Record<string, string> = {
  review: "مراجعة",
  approval: "اعتماد",
  assignment: "تحويل",
  execution: "تنفيذ",
  publish: "نشر",
  close: "إغلاق",
};

const BENEFICIARY_FIELDS = [
  "id",
  "organization_id",
  "full_name",
  "mobile",
  "national_id",
  "gender",
  "birth_date",
  "city",
  "district",
  "address",
  "notes",
  "created_at",
  "updated_at",
] as const;

const BENEFICIARY_CONTACT_FIELDS = [
  "id",
  "beneficiary_id",
  "name",
  "relation_type",
  "mobile",
  "email",
  "notes",
  "created_at",
  "updated_at",
] as const;

// ── Hooks ──
function useWorkflowTemplates() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow_templates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WorkflowTemplate[];
    },
  });
}

function useWorkflowStepsForTemplate(templateId: string | null) {
  return useQuery<WorkflowStep[]>({
    queryKey: ["workflow_steps", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_template_id", templateId!)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return data as WorkflowStep[];
    },
  });
}

function useStepAssignees(stepId: string | null) {
  return useQuery<StepAssignee[]>({
    queryKey: ["step_assignees", stepId],
    enabled: !!stepId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("workflow_step_assignees")
          .select("*")
          .eq("workflow_step_id", stepId!);
        if (error) {
          console.warn("[StepAssignees] Table may not exist:", error.message);
          return [];
        }
        return (data || []) as StepAssignee[];
      } catch {
        return [];
      }
    },
  });
}

function useCaseTypesLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<CaseType[]>({
    queryKey: ["case_types_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_types")
        .select("id, organization_id, name, code, description, requires_amount, requires_beneficiary, is_active")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data as CaseType[];
    },
  });
}

function useCaseSourcesLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<CaseSourceRow[]>({
    queryKey: ["case_sources_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_sources")
        .select("id, organization_id, name, code, is_active, sort_order, created_at, updated_at")
        .eq("organization_id", orgId!)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as CaseSourceRow[];
    },
  });
}

function useCasePrioritiesLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<CasePriorityRow[]>({
    queryKey: ["case_priorities_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_priorities")
        .select("id, organization_id, name, code, sort_order, created_at, updated_at")
        .eq("organization_id", orgId!)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as CasePriorityRow[];
    },
  });
}

function useCaseStatusesLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<CaseStatusRow[]>({
    queryKey: ["case_statuses_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_statuses")
        .select("id, organization_id, name, code, color, is_terminal, sort_order, created_at, updated_at")
        .eq("organization_id", orgId!)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as CaseStatusRow[];
    },
  });
}

function useOrganizationSettings(orgId: string | undefined) {
  return useQuery<OrganizationSettingsRow | null>({
    queryKey: ["organization_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("id, organization_id, has_branches, case_number_prefix, default_locale, allow_external_portal, require_official_reference, require_source_reference, allow_parallel_approvals, allow_multi_department_assignment, default_case_visibility, created_at, updated_at")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as OrganizationSettingsRow | null;
    },
  });
}

function useDepartmentsLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<Department[]>({
    queryKey: ["departments_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data as Department[];
    },
  });
}

function useRolesLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<RoleRow[]>({
    queryKey: ["roles_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, code")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data || []) as RoleRow[];
    },
  });
}

function useOrganizationInfo(orgId: string | undefined) {
  return useQuery<OrganizationRow | null>({
    queryKey: ["organization_info", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, commercial_name, logo_url, primary_color, secondary_color, contact_email, contact_mobile, address, country_code, timezone, is_active, created_at, updated_at")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as OrganizationRow | null;
    },
  });
}

function useBranches(orgId: string | undefined) {
  return useQuery<BranchRow[]>({
    queryKey: ["branches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, organization_id, name, code, city, address, contact_mobile, is_active, created_at, updated_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BranchRow[];
    },
  });
}

function useOrganizationDepartments(orgId: string | undefined) {
  return useQuery<OrganizationDepartmentRow[]>({
    queryKey: ["org_departments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, organization_id, branch_id, name, code, description, is_active, created_at, updated_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrganizationDepartmentRow[];
    },
  });
}

function useStepDefinitions() {
  return useQuery<StepDefinition[]>({
    queryKey: ["step_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_step_definitions")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as StepDefinition[];
    },
  });
}

// ── Action types for step permissions (must match DB constraint) ──
const ACTION_TYPES = [
  { code: "execute", label: "تنفيذ الخطوة", icon: Zap, color: "text-blue-600" },
  { code: "approve", label: "اعتماد الحالة", icon: CheckCircle2, color: "text-green-600" },
  { code: "return", label: "إرجاع الحالة", icon: RotateCcw, color: "text-amber-600" },
  { code: "edit", label: "تعديل بيانات الحالة", icon: Pencil, color: "text-purple-600" },
  { code: "assign", label: "تحويل الحالة", icon: ArrowRightLeft, color: "text-cyan-600" },
  { code: "close", label: "إغلاق الحالة", icon: Shield, color: "text-red-600" },
];

// ── Membership type for user assignments ──
interface MembershipRow {
  id: string;
  user_id: string;
  job_title: string | null;
  users: { full_name: string } | null;
  roles: { name: string } | null;
  departments: { name: string } | null;
}

function useMembershipsLookup() {
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  return useQuery<MembershipRow[]>({
    queryKey: ["memberships_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, user_id, job_title, users(full_name), roles(name), departments(name)")
        .eq("organization_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as unknown as MembershipRow[];
    },
  });
}

// ── Main Component ──
export default function Settings() {
  const { isLoading: pageLoading, canAccess } = usePageAccess("settings");
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;
  const queryClient = useQueryClient();

  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates();
  const { data: caseTypes } = useCaseTypesLookup();
  const { data: departments } = useDepartmentsLookup();
  const { data: roles } = useRolesLookup();
  const { data: memberships } = useMembershipsLookup();
  const { data: stepDefinitions } = useStepDefinitions();
  const { data: organizationInfo } = useOrganizationInfo(orgId);
  const { data: caseSources } = useCaseSourcesLookup();
  const { data: casePriorities } = useCasePrioritiesLookup();
  const { data: caseStatuses } = useCaseStatusesLookup();
  const { data: orgCaseSettings } = useOrganizationSettings(orgId);
  const { data: branches } = useBranches(orgId);
  const { data: organizationDepartments } = useOrganizationDepartments(orgId);

  // ── State ──
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [activeSection, setActiveSection] = useState("workflows");
  const [settingsSearch, setSettingsSearch] = useState("");
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [editingStepSheetOpen, setEditingStepSheetOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<Partial<WorkflowStep> | null>(null);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);

  const { data: steps, isLoading: stepsLoading } = useWorkflowStepsForTemplate(selectedTemplate?.id || null);
  const { data: editingStepAssignees } = useStepAssignees(editingStep?.id || null);

  const settingsSections = [
    { key: "org", label: "بيانات الجهة", hint: "الهوية الأساسية وإعدادات الجهة" },
    { key: "branches_departments", label: "الفروع والأقسام", hint: "إدارة الفروع والأقسام التنظيمية" },
    { key: "users_memberships", label: "المستخدمون والعضويات", hint: "إدارة المستخدمين وعضوياتهم" },
    { key: "roles_permissions", label: "الأدوار والصلاحيات", hint: "إدارة الأدوار وربط الصلاحيات" },
    { key: "cases", label: "الحالات", hint: "تهيئة أنواع ومصادر وأولويات الحالات" },
    { key: "workflows", label: "المسارات", hint: "إعداد مسارات أنواع الحالات" },
    { key: "beneficiaries", label: "المستفيدون", hint: "ضبط إعدادات بيانات المستفيدين" },
    { key: "attachments", label: "المرفقات", hint: "ضبط أنواع وسياسات المرفقات" },
    { key: "resource_dev", label: "تنمية الموارد المالية", hint: "إعدادات نشر الحالات والتحصيل" },
    { key: "crm", label: "خدمة العملاء CRM", hint: "إعداد قنوات التواصل والتذاكر" },
    { key: "integrations", label: "التكاملات", hint: "إعداد مزودي الخدمات والمفاتيح" },
    { key: "notifications", label: "الإشعارات", hint: "إدارة قنوات وقوالب الإشعارات" },
    { key: "reports", label: "التقارير", hint: "تفضيلات التقارير ولوحة التحكم" },
    { key: "security", label: "الأمان والحوكمة", hint: "سجل العمليات وسياسات الحوكمة" },
    { key: "portal", label: "البوابة الخارجية", hint: "إعدادات البوابة والخدمات الخارجية" },
  ] as const;

  const normalizedSearch = settingsSearch.trim().toLowerCase();
  const visibleSections = settingsSections.filter((section) => {
    if (!normalizedSearch) return true;
    return section.label.toLowerCase().includes(normalizedSearch) || section.hint.toLowerCase().includes(normalizedSearch);
  });

  const activeSectionMeta = settingsSections.find((section) => section.key === activeSection) || settingsSections[5];

  // ── Template CRUD ──
  const saveTemplate = useMutation({
    mutationFn: async (tmpl: { id?: string; name: string; code: string; case_type_id: string | null; is_active: boolean }) => {
      if (tmpl.id) {
        const { error } = await supabase
          .from("workflow_templates")
          .update({ name: tmpl.name, code: tmpl.code, case_type_id: tmpl.case_type_id, is_active: tmpl.is_active })
          .eq("id", tmpl.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workflow_templates")
          .insert({ name: tmpl.name, code: tmpl.code, case_type_id: tmpl.case_type_id, organization_id: orgId!, is_active: tmpl.is_active });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_templates"] });
      setTemplateSheetOpen(false);
      toast.success("تم حفظ المسار بنجاح");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_templates"] });
      setSelectedTemplate(null);
      toast.success("تم حذف المسار");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Copy Template ──
  const copyTemplate = useMutation({
    mutationFn: async (tmpl: WorkflowTemplate) => {
      // 1. Create copy of template
      const newCode = tmpl.code + "_copy_" + Date.now().toString(36);
      const { data: newTmpl, error: tmplErr } = await supabase
        .from("workflow_templates")
        .insert({ name: tmpl.name + " (نسخة)", code: newCode, case_type_id: tmpl.case_type_id, organization_id: tmpl.organization_id, is_active: true })
        .select()
        .single();
      if (tmplErr) throw tmplErr;
      // 2. Copy steps
      const { data: srcSteps } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_template_id", tmpl.id)
        .order("step_order");
      if (srcSteps && srcSteps.length > 0) {
        const newSteps = srcSteps.map((s: any) => ({
          workflow_template_id: newTmpl.id,
          name: s.name,
          code: s.code,
          step_order: s.step_order,
          step_type: s.step_type,
          department_id: s.department_id,
          is_required: s.is_required,
          allow_parallel_approvals: s.allow_parallel_approvals,
          allow_return_for_info: s.allow_return_for_info,
          auto_move_on_success: s.auto_move_on_success,
          is_active: s.is_active,
        }));
        const { error: stepsErr } = await supabase.from("workflow_steps").insert(newSteps);
        if (stepsErr) throw stepsErr;
      }
      return newTmpl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_templates"] });
      toast.success("تم نسخ المسار بنجاح");
    },
    onError: (e: any) => toast.error("خطأ في النسخ: " + e.message),
  });

  // ── Seed Default Templates ──
  const seedTemplates = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("لا توجد جهة محددة");

      // Create case types if not exist
      const caseTypesDefs = [
        { name: "سداد دين", code: "debt_payment" },
        { name: "سداد فاتورة كهرباء", code: "electricity_bill" },
        { name: "سداد إيجار", code: "rent_payment" },
      ];
      const createdCaseTypes: { id: string; code: string }[] = [];
      for (const ct of caseTypesDefs) {
        const { data: existing } = await supabase
          .from("case_types")
          .select("id, code")
          .eq("code", ct.code)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (existing) {
          createdCaseTypes.push(existing);
        } else {
          const { data: created, error } = await supabase
            .from("case_types")
            .insert({ ...ct, organization_id: orgId })
            .select("id, code")
            .single();
          if (error) throw error;
          createdCaseTypes.push(created);
        }
      }

      // Template definitions with steps
      const templateDefs = [
        {
          name: "مسار سداد دين",
          code: "debt_payment_workflow",
          caseTypeCode: "debt_payment",
          steps: [
            { name: "استقبال الطلب", code: "intake", step_type: "assignment", step_order: 1 },
            { name: "دراسة الحالة", code: "case_study", step_type: "review", step_order: 2 },
            { name: "اعتماد المدير", code: "manager_approval", step_type: "approval", step_order: 3 },
            { name: "اعتماد مالي", code: "finance_approval", step_type: "approval", step_order: 4 },
            { name: "تنفيذ السداد", code: "payment_execution", step_type: "execution", step_order: 5 },
            { name: "إغلاق الحالة", code: "case_closure", step_type: "close", step_order: 6 },
          ],
        },
        {
          name: "مسار سداد فاتورة كهرباء",
          code: "electricity_bill_workflow",
          caseTypeCode: "electricity_bill",
          steps: [
            { name: "استقبال الطلب", code: "intake", step_type: "assignment", step_order: 1 },
            { name: "مراجعة المستندات", code: "document_review", step_type: "review", step_order: 2 },
            { name: "اعتماد المدير", code: "manager_approval", step_type: "approval", step_order: 3 },
            { name: "تنفيذ السداد", code: "payment_execution", step_type: "execution", step_order: 4 },
            { name: "إغلاق الحالة", code: "case_closure", step_type: "close", step_order: 5 },
          ],
        },
        {
          name: "مسار سداد إيجار",
          code: "rent_payment_workflow",
          caseTypeCode: "rent_payment",
          steps: [
            { name: "استقبال الطلب", code: "intake", step_type: "assignment", step_order: 1 },
            { name: "دراسة الحالة", code: "case_study", step_type: "review", step_order: 2 },
            { name: "اعتماد المدير", code: "manager_approval", step_type: "approval", step_order: 3 },
            { name: "اعتماد مالي", code: "finance_approval", step_type: "approval", step_order: 4 },
            { name: "تنفيذ السداد", code: "payment_execution", step_type: "execution", step_order: 5 },
            { name: "إغلاق الحالة", code: "case_closure", step_type: "close", step_order: 6 },
          ],
        },
      ];

      let createdCount = 0;
      let skippedCount = 0;

      for (const tmplDef of templateDefs) {
        // Check if template already exists by code
        const { data: existingTmpl } = await supabase
          .from("workflow_templates")
          .select("id")
          .eq("code", tmplDef.code)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (existingTmpl) {
          skippedCount++;
          continue;
        }

        const caseType = createdCaseTypes.find((ct) => ct.code === tmplDef.caseTypeCode);
        const { data: tmpl, error: tmplErr } = await supabase
          .from("workflow_templates")
          .insert({ name: tmplDef.name, code: tmplDef.code, case_type_id: caseType?.id || null, organization_id: orgId, is_active: true })
          .select()
          .single();
        if (tmplErr) throw tmplErr;

        const stepsToInsert = tmplDef.steps.map((s) => ({
          workflow_template_id: tmpl.id,
          ...s,
          is_required: true,
          allow_parallel_approvals: false,
          allow_return_for_info: true,
          auto_move_on_success: false,
          is_active: true,
        }));
        const { error: stepsErr } = await supabase.from("workflow_steps").insert(stepsToInsert);
        if (stepsErr) throw stepsErr;
        createdCount++;
      }

      return { createdCount, skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["workflow_templates"] });
      queryClient.invalidateQueries({ queryKey: ["case_types_settings"] });
      if (result.createdCount === 0) {
        toast.info("القوالب مثبتة مسبقًا");
      } else {
        toast.success(`تم تثبيت ${result.createdCount} قالب جديد` + (result.skippedCount > 0 ? ` (${result.skippedCount} موجودة مسبقًا)` : ""));
      }
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Step CRUD ──
  const saveStep = useMutation({
    mutationFn: async (step: Partial<WorkflowStep> & { workflow_template_id: string }) => {
      if (step.id) {
        const { id, ...rest } = step;
        const { error } = await supabase.from("workflow_steps").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workflow_steps").insert(step);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_steps"] });
      setAddStepDialogOpen(false);
      setEditingStepSheetOpen(false);
      toast.success("تم حفظ الخطوة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase.from("workflow_steps").delete().eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_steps"] });
      toast.success("تم حذف الخطوة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const reorderStep = useMutation({
    mutationFn: async ({ stepId, newOrder }: { stepId: string; newOrder: number }) => {
      const { error } = await supabase.from("workflow_steps").update({ step_order: newOrder }).eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow_steps"] }),
  });

  // ── Step Assignee CRUD ──
  const saveAssignee = useMutation({
    mutationFn: async (assignee: { workflow_step_id: string; assignment_type: string; action_type: string; role_id: string | null; department_id: string | null; membership_id: string | null }) => {
      const { error } = await supabase.from("workflow_step_assignees").insert(assignee);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["step_assignees"] });
      toast.success("تم إضافة الصلاحية");
    },
    onError: () => toast.error("حدث خطأ أثناء إضافة الصلاحية، يرجى المحاولة مرة أخرى"),
  });

  const deleteAssignee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_step_assignees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["step_assignees"] });
      toast.success("تم إزالة الصلاحية");
    },
    onError: () => toast.error("حدث خطأ أثناء إزالة الصلاحية"),
  });

  // ── Access check ──
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (canAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground">ليس لديك صلاحية عرض الإعدادات</p>
        </div>
      </div>
    );
  }

  const getCaseTypeName = (id: string | null) => caseTypes?.find((ct) => ct.id === id)?.name || "—";
  const getDeptName = (id: string | null | undefined) => departments?.find((d) => d.id === id)?.name || "—";
  const getRoleName = (id: string | null | undefined) => roles?.find((r) => r.id === id)?.name || "—";

  const handleMoveStep = (step: WorkflowStep, direction: "up" | "down") => {
    if (!steps) return;
    const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
    const idx = sorted.findIndex((s) => s.id === step.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    reorderStep.mutate({ stepId: step.id, newOrder: other.step_order });
    reorderStep.mutate({ stepId: other.id, newOrder: step.step_order });
  };

  const openTemplateEditor = (tmpl: WorkflowTemplate | null) => {
    setEditingTemplate(tmpl);
    setTemplateSheetOpen(true);
  };

  const openStepEditor = (step: WorkflowStep) => {
    setEditingStep(step);
    setEditingStepSheetOpen(true);
  };

  if (activeSection !== "workflows" && activeSection !== "cases") {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">إعدادات الجهة</h1>
          <p className="text-sm text-muted-foreground">مركز إعدادات موحّد لإدارة الجهة</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <Input
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
              placeholder="ابحث داخل أقسام الإعدادات..."
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleSections.map((section) => (
                <Button
                  key={section.key}
                  variant={activeSection === section.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveSection(section.key);
                    setSelectedTemplate(null);
                  }}
                  className="whitespace-nowrap"
                >
                  {section.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeSection === "org" ? (
          <OrganizationOverviewSection organization={organizationInfo} />
        ) : activeSection === "branches_departments" && orgId ? (
          <BranchesDepartmentsSection orgId={orgId} branches={branches || []} departments={organizationDepartments || []} />
        ) : activeSection === "beneficiaries" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>الحقول الحالية للمستفيدين (beneficiaries)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  هذا القسم توثيقي فقط داخل الإعدادات، ويعرض الحقول المعتمدة حاليًا في قاعدة البيانات بدون أي بيانات فعلية.
                </p>
                <div className="flex flex-wrap gap-2">
                  {BENEFICIARY_FIELDS.map((field) => (
                    <Badge key={field} variant="secondary" className="font-mono text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حقول جهات اتصال المستفيد (beneficiary_contacts)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {BENEFICIARY_CONTACT_FIELDS.map((field) => (
                    <Badge key={field} variant="secondary" className="font-mono text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <strong>ملاحظة:</strong> الحقل <span className="font-mono">relation_type</span> حاليًا نص حر، ولا يوجد له جدول إعدادات معياري مستقل في الـ schema الحالية.
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>العلاقات الحالية المرتبطة بالمستفيدين</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="rounded-md border p-3">- <span className="font-mono">beneficiary_contacts.beneficiary_id</span> مرتبط بجدول <span className="font-mono">beneficiaries</span>.</div>
                <div className="rounded-md border p-3">- <span className="font-mono">cases.beneficiary_id</span> يربط الحالات بالمستفيد.</div>
                <div className="rounded-md border p-3">- <span className="font-mono">attachments</span> قد ترتبط بالمستفيد مباشرة عبر <span className="font-mono">beneficiary_id</span> أو بالحالة عبر <span className="font-mono">case_id</span>.</div>
                <div className="rounded-md border p-3">- <span className="font-mono">activity_logs</span> لا تحتوي FK مباشر مع المستفيد، والربط منطقي عبر <span className="font-mono">entity_type/entity_id</span>.</div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>غير مدعوم حاليًا (يتطلب مرحلة قاعدة بيانات لاحقة)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  "أنواع جهات الاتصال المعيارية.",
                  "تصنيفات المستفيدين.",
                  "قواعد منع التكرار.",
                  "تنبيه الدعم السابق.",
                  "قواعد احتساب إجمالي الدعم والصرف.",
                  "إعدادات حقول المستفيد القابلة للتخصيص.",
                ].map((item) => (
                  <div key={item} className="rounded-md border border-dashed p-3 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{activeSectionMeta.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{activeSectionMeta.hint}</p>
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                هذا القسم قيد التجهيز وسيتم تنفيذه في مرحلة لاحقة بعد اعتماد نطاقه التفصيلي.
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => setActiveSection("workflows")}>
                  الانتقال إلى قسم المسارات
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── If a template is selected, show its detail view ──
  if (selectedTemplate) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card>
          <CardContent className="p-4 space-y-4">
            <Input
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
              placeholder="ابحث داخل أقسام الإعدادات..."
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleSections.map((section) => (
                <Button
                  key={section.key}
                  variant={activeSection === section.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveSection(section.key);
                    if (section.key !== "workflows") setSelectedTemplate(null);
                  }}
                  className="whitespace-nowrap"
                >
                  {section.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTemplate(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{selectedTemplate.name}</h1>
              <Badge variant={selectedTemplate.is_active ? "default" : "secondary"}>
                {selectedTemplate.is_active ? "نشط" : "غير نشط"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              كود: <span className="font-mono">{selectedTemplate.code}</span> · نوع الحالة: {getCaseTypeName(selectedTemplate.case_type_id)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openTemplateEditor(selectedTemplate)}>
              <Pencil className="h-4 w-4 ml-1.5" />
              تعديل المسار
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyTemplate.mutate(selectedTemplate)}
              disabled={copyTemplate.isPending}
            >
              {copyTemplate.isPending ? <Loader2 className="h-4 w-4 ml-1.5 animate-spin" /> : <Copy className="h-4 w-4 ml-1.5" />}
              نسخ المسار
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("هل تريد حذف هذا المسار وجميع خطواته؟")) {
                  deleteTemplate.mutate(selectedTemplate.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 ml-1.5" />
              حذف
            </Button>
          </div>
        </div>

        <Separator />

        {/* Steps Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              خطوات المسار
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                const nextOrder = steps?.length ? Math.max(...steps.map((s) => s.step_order)) + 1 : 1;
                setEditingStep({
                  workflow_template_id: selectedTemplate.id,
                  step_order: nextOrder,
                  name: "",
                  code: "",
                });
                setAddStepDialogOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              إضافة خطوة
            </Button>
          </CardHeader>
          <CardContent>
            {stepsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !steps?.length ? (
              <div className="text-center py-12 space-y-2">
                <ListOrdered className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">لا توجد خطوات لهذا المسار</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingStep({
                      workflow_template_id: selectedTemplate.id,
                      step_order: 1,
                      name: "",
                      code: "",
                    });
                    setAddStepDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  أضف أول خطوة
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...steps].sort((a, b) => a.step_order - b.step_order).map((step, idx) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={idx}
                    totalSteps={steps.length}
                    getDeptName={getDeptName}
                    onEdit={() => openStepEditor(step)}
                    onDelete={() => { if (confirm("هل تريد حذف هذه الخطوة؟")) deleteStep.mutate(step.id); }}
                    onMoveUp={() => handleMoveStep(step, "up")}
                    onMoveDown={() => handleMoveStep(step, "down")}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Step Dialog */}
        <AddStepDialog
          open={addStepDialogOpen}
          onOpenChange={setAddStepDialogOpen}
          step={editingStep}
          departments={departments || []}
          stepDefinitions={stepDefinitions || []}
          onSave={(data) => saveStep.mutate(data as any)}
          saving={saveStep.isPending}
        />

        {/* Edit Step Sheet (full drawer) */}
        <StepEditorSheet
          open={editingStepSheetOpen}
          onOpenChange={setEditingStepSheetOpen}
          step={editingStep as WorkflowStep | null}
          departments={departments || []}
          roles={roles || []}
          memberships={memberships || []}
          stepDefinitions={stepDefinitions || []}
          assignees={editingStepAssignees || []}
          getDeptName={getDeptName}
          getRoleName={getRoleName}
          onSave={(data) => saveStep.mutate(data as any)}
          onAddAssignee={(data) => saveAssignee.mutate(data)}
          onRemoveAssignee={(id) => deleteAssignee.mutate(id)}
          saving={saveStep.isPending}
          assigneeSaving={saveAssignee.isPending}
        />

        {/* Template Sheet */}
        <TemplateSheet
          open={templateSheetOpen}
          onOpenChange={setTemplateSheetOpen}
          template={editingTemplate}
          existingCodes={templates?.map(t => t.code) || []}
          caseTypes={caseTypes || []}
          onSave={(data) => saveTemplate.mutate(data)}
          saving={saveTemplate.isPending}
        />
      </div>
    );
  }

  // ── Templates List View ──
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">إعدادات الجهة</h1>
        <p className="text-sm text-muted-foreground">مركز إعدادات موحّد لإدارة الجهة</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            value={settingsSearch}
            onChange={(e) => setSettingsSearch(e.target.value)}
            placeholder="ابحث داخل أقسام الإعدادات..."
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleSections.map((section) => (
              <Button
                key={section.key}
                variant={activeSection === section.key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveSection(section.key);
                  if (section.key !== "workflows") setSelectedTemplate(null);
                }}
                className="whitespace-nowrap"
              >
                {section.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{activeSection === "cases" ? "قسم إعدادات الحالات" : "قسم المسارات"}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{activeSection === "cases" ? "عرض مرجعية إعدادات الحالات (قراءة فقط)" : "إدارة مسارات أنواع الحالات"}</p>
        </div>
      </div>

      {activeSection === "cases" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>أنواع الحالات</CardTitle></CardHeader><CardContent className="space-y-2">{(caseTypes || []).map((row) => <div key={row.id} className="rounded-md border p-3 text-sm space-y-2"><div className="font-medium">{row.name}</div><div className="text-muted-foreground font-mono text-xs">{row.code}</div><div className="text-muted-foreground text-xs">{row.description || "لا يوجد وصف"}</div><div className="flex flex-wrap items-center gap-2"><Badge variant={row.requires_amount ? "default" : "secondary"}>{row.requires_amount ? "يتطلب مبلغًا" : "لا يتطلب مبلغًا"}</Badge><Badge variant={row.requires_beneficiary ? "default" : "secondary"}>{row.requires_beneficiary ? "يتطلب مستفيدًا" : "لا يتطلب مستفيدًا"}</Badge><Badge variant={row.is_active ? "default" : "outline"}>{row.is_active ? "نشط" : "غير نشط"}</Badge></div></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>مصادر الحالات</CardTitle></CardHeader><CardContent className="space-y-2">{(caseSources || []).map((row) => <div key={row.id} className="rounded-md border p-3 text-sm space-y-1"><div className="font-medium">{row.name}</div><div className="text-muted-foreground font-mono text-xs">{row.code}</div></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>أولويات الحالات</CardTitle></CardHeader><CardContent className="space-y-2">{(casePriorities || []).map((row) => <div key={row.id} className="rounded-md border p-3 text-sm space-y-1"><div className="font-medium">{row.name}</div><div className="text-muted-foreground font-mono text-xs">{row.code}</div></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>حالات الحالة</CardTitle></CardHeader><CardContent className="space-y-2">{(caseStatuses || []).map((row) => <div key={row.id} className="rounded-md border p-3 text-sm space-y-1"><div className="font-medium flex items-center gap-2">{row.name}{row.is_terminal ? <Badge variant="secondary">نهائية</Badge> : null}</div><div className="text-muted-foreground font-mono text-xs">{row.code}</div></div>)}</CardContent></Card>
          <Card className="lg:col-span-2"><CardHeader><CardTitle>السياسات العامة للحالات</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><div className="rounded-md border p-3">وجود فروع: <strong>{orgCaseSettings?.has_branches ? "نعم" : "لا"}</strong></div><div className="rounded-md border p-3">بادئة رقم الحالة: <strong>{orgCaseSettings?.case_number_prefix || "—"}</strong></div><div className="rounded-md border p-3">اللغة الافتراضية: <strong>{orgCaseSettings?.default_locale || "—"}</strong></div><div className="rounded-md border p-3">السماح بالبوابة الخارجية: <strong>{orgCaseSettings?.allow_external_portal ? "نعم" : "لا"}</strong></div><div className="rounded-md border p-3">مرجع رسمي إلزامي: <strong>{orgCaseSettings?.require_official_reference ? "نعم" : "لا"}</strong></div><div className="rounded-md border p-3">مرجع المصدر إلزامي: <strong>{orgCaseSettings?.require_source_reference ? "نعم" : "لا"}</strong></div><div className="rounded-md border p-3">الموافقات المتوازية: <strong>{orgCaseSettings?.allow_parallel_approvals ? "نعم" : "لا"}</strong></div><div className="rounded-md border p-3">إسناد متعدد الإدارات: <strong>{orgCaseSettings?.allow_multi_department_assignment ? "نعم" : "لا"}</strong></div><div className="rounded-md border p-3 md:col-span-2">رؤية الحالة الافتراضية: <strong>{orgCaseSettings?.default_case_visibility || "—"}</strong></div></CardContent></Card>
        </div>
      ) : (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            مسارات أنواع الحالات
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedTemplates.mutate()}
              disabled={seedTemplates.isPending}
              className="gap-1.5"
            >
              {seedTemplates.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              تثبيت قوالب جاهزة
            </Button>
            <Button
              size="sm"
              onClick={() => openTemplateEditor(null)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              مسار جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-12 space-y-3">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">لا توجد مسارات حاليًا</p>
              <Button variant="outline" onClick={() => openTemplateEditor(null)}>
                <Plus className="h-4 w-4 ml-1.5" />
                أنشئ أول مسار
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المسار</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">نوع الحالة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right w-28">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tmpl) => (
                  <TableRow
                    key={tmpl.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedTemplate(tmpl)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        {tmpl.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tmpl.code}</TableCell>
                    <TableCell>{getCaseTypeName(tmpl.case_type_id)}</TableCell>
                    <TableCell>
                      <Badge variant={tmpl.is_active ? "default" : "secondary"} className="text-xs">
                        {tmpl.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openTemplateEditor(tmpl); }}
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); copyTemplate.mutate(tmpl); }}
                          title="نسخ المسار"
                          disabled={copyTemplate.isPending}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); setSelectedTemplate(tmpl); }}
                          title="عرض"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {/* Step Definitions Library */}
      <StepDefinitionsLibrary />

      {/* Template Sheet */}
      <TemplateSheet
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        template={editingTemplate}
        existingCodes={templates?.map(t => t.code) || []}
        caseTypes={caseTypes || []}
        onSave={(data) => saveTemplate.mutate(data)}
        saving={saveTemplate.isPending}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step Card — rich display of step info
// ══════════════════════════════════════════════════════
function StepCard({
  step,
  index,
  totalSteps,
  getDeptName,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  getDeptName: (id: string | null | undefined) => string;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isInactive = step.is_active === false;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isInactive
          ? "border-border/50 bg-muted/20 opacity-70"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Order controls + number */}
        <div className="flex flex-col items-center gap-0.5 min-w-[44px] pt-1">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
            {step.step_order}
          </div>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            disabled={index === totalSteps - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Row 1: Name + status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-foreground">{step.name}</h4>
            {isInactive && (
              <Badge variant="secondary" className="text-xs">غير نشطة</Badge>
            )}
            {!isInactive && (
              <Badge variant="default" className="text-xs">نشطة</Badge>
            )}
          </div>

          {/* Row 2: Key info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground/70">الكود:</span>
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{step.code}</code>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground/70">النوع:</span>
              <Badge variant="outline" className="text-[11px] h-5">
                {STEP_TYPE_LABELS[step.step_type || "review"] || step.step_type || "مراجعة"}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground/70">القسم:</span>
              <span className="truncate">{getDeptName(step.department_id)}</span>
            </div>
          </div>

          {/* Row 3: Feature badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <FeatureBadge active={!!step.is_required} label="مطلوبة" icon={AlertCircle} />
            <FeatureBadge active={!!step.allow_return_for_info} label="إرجاع للاستفسار" icon={RotateCcw} />
            <FeatureBadge active={!!step.allow_parallel_approvals} label="اعتماد متوازي" icon={Users} />
            <FeatureBadge active={!!step.auto_move_on_success} label="انتقال تلقائي" icon={Zap} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            تعديل
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Feature Badge ──
function FeatureBadge({ active, label, icon: Icon }: { active: boolean; label: string; icon: any }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        active
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted/50 text-muted-foreground/50 border-transparent line-through"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ══════════════════════════════════════════════════════
// Step Editor Sheet (full drawer with permissions)
// ══════════════════════════════════════════════════════
function StepEditorSheet({
  open,
  onOpenChange,
  step,
  departments,
  roles,
  memberships,
  stepDefinitions,
  assignees,
  getDeptName,
  getRoleName,
  onSave,
  onAddAssignee,
  onRemoveAssignee,
  saving,
  assigneeSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  step: WorkflowStep | null;
  departments: Department[];
  roles: RoleRow[];
  memberships: MembershipRow[];
  stepDefinitions: StepDefinition[];
  assignees: StepAssignee[];
  getDeptName: (id: string | null | undefined) => string;
  getRoleName: (id: string | null | undefined) => string;
  onSave: (data: Partial<WorkflowStep>) => void;
  onAddAssignee: (data: { workflow_step_id: string; assignment_type: string; action_type: string; role_id: string | null; department_id: string | null; membership_id: string | null }) => void;
  onRemoveAssignee: (id: string) => void;
  saving: boolean;
  assigneeSaving: boolean;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [stepType, setStepType] = useState("review");
  const [order, setOrder] = useState(1);
  const [deptId, setDeptId] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [allowParallelApprovals, setAllowParallelApprovals] = useState(false);
  const [allowReturnForInfo, setAllowReturnForInfo] = useState(false);
  const [autoMoveOnSuccess, setAutoMoveOnSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<"details" | "permissions">("details");

  useEffect(() => {
    if (open && step) {
      setName(step.name || "");
      setCode(step.code || "");
      setStepType(step.step_type || "review");
      setOrder(step.step_order || 1);
      setDeptId(step.department_id || "");
      setIsRequired(step.is_required || false);
      setAllowParallelApprovals(step.allow_parallel_approvals || false);
      setAllowReturnForInfo(step.allow_return_for_info || false);
      setAutoMoveOnSuccess(step.auto_move_on_success || false);
      setActiveSection("details");
    }
  }, [open, step]);

  if (!step) return null;

  const isFromLibrary = stepDefinitions.some(d => d.code === step.code);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto" dir="rtl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            تعديل الخطوة: {step.name}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)} dir="rtl">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details" className="gap-1.5">
              <FileText className="h-4 w-4" />
              بيانات الخطوة
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5">
              <Shield className="h-4 w-4" />
              صلاحيات التنفيذ
            </TabsTrigger>
          </TabsList>

          {/* ─── Details Tab ─── */}
          <TabsContent value="details" className="space-y-5 mt-0">
            {/* Read-only fields from library */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                معلومات الخطوة
                {isFromLibrary && (
                  <Badge variant="outline" className="text-[10px]">من المكتبة</Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">اسم الخطوة</Label>
                  <Input value={name} readOnly={isFromLibrary} onChange={(e) => !isFromLibrary && setName(e.target.value)} className={`mt-1 ${isFromLibrary ? "bg-muted/50" : ""}`} />
                  {isFromLibrary && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">الاسم مأخوذ من المكتبة</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">كود الخطوة</Label>
                  <Input value={code} readOnly className="font-mono mt-1 bg-muted/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">نوع الخطوة</Label>
                  <Input value={STEP_TYPE_LABELS[stepType] || stepType} readOnly className="mt-1 bg-muted/50" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Editable fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                إعدادات الخطوة
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">الترتيب</Label>
                  <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} min={1} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">القسم المسؤول</Label>
                  <Select value={deptId} onValueChange={setDeptId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختياري" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون قسم</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Feature toggles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Zap className="h-4 w-4 text-muted-foreground" />
                خصائص الخطوة
              </div>
              <div className="space-y-3">
                <ToggleRow label="مطلوبة" description="يجب إكمال هذه الخطوة قبل الانتقال" checked={isRequired} onChange={setIsRequired} />
                <ToggleRow label="اعتماد متوازي" description="يسمح لأكثر من شخص بالاعتماد في نفس الوقت" checked={allowParallelApprovals} onChange={setAllowParallelApprovals} />
                <ToggleRow label="تسمح بالإرجاع للاستفسار" description="يمكن إرجاع الحالة لمزيد من المعلومات" checked={allowReturnForInfo} onChange={setAllowReturnForInfo} />
                <ToggleRow label="انتقال تلقائي عند النجاح" description="الانتقال للخطوة التالية تلقائيًا بعد الاعتماد" checked={autoMoveOnSuccess} onChange={setAutoMoveOnSuccess} />
              </div>
            </div>

            <Separator />

            <Button
              className="w-full"
              onClick={() =>
                onSave({
                  id: step.id,
                  workflow_template_id: step.workflow_template_id,
                  name,
                  code,
                  step_type: stepType,
                  step_order: order,
                  department_id: deptId && deptId !== "none" ? deptId : null,
                  is_required: isRequired,
                  allow_parallel_approvals: allowParallelApprovals,
                  allow_return_for_info: allowReturnForInfo,
                  auto_move_on_success: autoMoveOnSuccess,
                })
              }
              disabled={!name.trim() || !code.trim() || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حفظ التعديلات
            </Button>
          </TabsContent>

          {/* ─── Permissions Tab ─── */}
          <TabsContent value="permissions" className="mt-0">
            <div className="space-y-4">
              {ACTION_TYPES.map((action) => {
                const Icon = action.icon;
                const actionAssignees = assignees.filter((a) => a.action_type === action.code);

                return (
                  <ActionPermissionCard
                    key={action.code}
                    actionCode={action.code}
                    actionLabel={action.label}
                    ActionIcon={Icon}
                    iconColor={action.color}
                    assignees={actionAssignees}
                    roles={roles}
                    memberships={memberships}
                    departments={departments}
                    stepId={step.id}
                    getRoleName={getRoleName}
                    getDeptName={getDeptName}
                    onAdd={onAddAssignee}
                    onRemove={onRemoveAssignee}
                    saving={assigneeSaving}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ── Toggle Row ──
function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ── Action Permission Card ──
function ActionPermissionCard({
  actionCode,
  actionLabel,
  ActionIcon,
  iconColor,
  assignees,
  roles,
  memberships,
  departments,
  stepId,
  getRoleName,
  getDeptName,
  onAdd,
  onRemove,
  saving,
}: {
  actionCode: string;
  actionLabel: string;
  ActionIcon: any;
  iconColor: string;
  assignees: StepAssignee[];
  roles: RoleRow[];
  memberships: MembershipRow[];
  departments: Department[];
  stepId: string;
  getRoleName: (id: string | null | undefined) => string;
  getDeptName: (id: string | null | undefined) => string;
  onAdd: (data: { workflow_step_id: string; assignment_type: string; action_type: string; role_id: string | null; department_id: string | null; membership_id: string | null }) => void;
  onRemove: (id: string) => void;
  saving: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [assignmentType, setAssignmentType] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [validationError, setValidationError] = useState("");

  const resetForm = () => {
    setAssignmentType("");
    setSelectedEntityId("");
    setValidationError("");
  };

  const handleAdd = () => {
    if (!assignmentType) {
      setValidationError("يرجى تحديد نوع الإسناد");
      return;
    }
    if (!selectedEntityId) {
      setValidationError("يرجى تحديد الجهة المرتبطة");
      return;
    }
    setValidationError("");
    onAdd({
      workflow_step_id: stepId,
      assignment_type: assignmentType,
      action_type: actionCode,
      role_id: assignmentType === "role" ? selectedEntityId : null,
      department_id: assignmentType === "department" ? selectedEntityId : null,
      membership_id: assignmentType === "user" ? selectedEntityId : null,
    });
    setShowAddForm(false);
    resetForm();
  };

  const getMemberName = (id: string | null | undefined) => {
    if (!id) return "غير محدد";
    const m = memberships.find(mb => mb.id === id);
    if (!m) return "غير محدد";
    const name = m.users?.full_name || "—";
    const role = m.roles?.name || "";
    const dept = m.departments?.name || "";
    return [name, role, dept].filter(Boolean).join(" · ");
  };

  const getAssigneeName = (a: StepAssignee) => {
    if (a.assignment_type === "role" && a.role_id) return getRoleName(a.role_id);
    if (a.assignment_type === "department" && a.department_id) return getDeptName(a.department_id);
    if (a.assignment_type === "user" && a.membership_id) return getMemberName(a.membership_id);
    if (a.role_id) return getRoleName(a.role_id);
    if (a.department_id) return getDeptName(a.department_id);
    if (a.membership_id) return getMemberName(a.membership_id);
    return "غير محدد";
  };

  const getAssigneeTypeLabel = (a: StepAssignee) => {
    return ASSIGNMENT_TYPE_LABELS[a.assignment_type] || a.assignment_type;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <ActionIcon className={`h-4 w-4 ${iconColor}`} />
          <span className="font-medium text-sm">{actionLabel}</span>
          <Badge variant="secondary" className="text-[10px] h-5">{assignees.length}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => {
            setShowAddForm(!showAddForm);
            resetForm();
          }}
        >
          <Plus className="h-3 w-3" />
          إضافة
        </Button>
      </div>

      {/* Existing assignees as badges */}
      {assignees.length > 0 && (
        <div className="px-4 py-2.5 flex flex-wrap gap-2 border-t border-border">
          {assignees.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 py-1 px-2.5 text-xs border rounded-md">
              <span className="text-muted-foreground">{getAssigneeTypeLabel(a)}:</span>
              <span className="font-medium">{getAssigneeName(a)}</span>
              <button
                type="button"
                className="h-4 w-4 p-0 inline-flex items-center justify-center text-destructive hover:text-destructive/80"
                onClick={() => onRemove(a.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="px-4 py-3 bg-muted/10 border-t border-border space-y-3">
          {validationError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5" />
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assignment Type */}
            <div>
              <Label className="text-xs">نوع الإسناد <span className="text-destructive">*</span></Label>
              <Select value={assignmentType} onValueChange={(v) => { setAssignmentType(v); setSelectedEntityId(""); setValidationError(""); }}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="اختر نوع الإسناد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">دور</SelectItem>
                  <SelectItem value="department">قسم</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity based on type */}
            <div>
              <Label className="text-xs">الجهة المرتبطة <span className="text-destructive">*</span></Label>
              <Select value={selectedEntityId} onValueChange={(v) => { setSelectedEntityId(v); setValidationError(""); }} disabled={!assignmentType}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder={!assignmentType ? "اختر نوع الإسناد أولاً" : "اختر"} />
                </SelectTrigger>
                <SelectContent>
                  {assignmentType === "role" && roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                  {assignmentType === "department" && departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                  {assignmentType === "user" && memberships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.users?.full_name || "—"} {m.roles?.name ? `(${m.roles.name})` : ""} {m.departments?.name ? `- ${m.departments.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowAddForm(false); resetForm(); }}>
              إلغاء
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : null}
              حفظ الصلاحية
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Add Step Dialog (for new steps only)
// ══════════════════════════════════════════════════════
function AddStepDialog({
  open, onOpenChange, step, departments, stepDefinitions, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  step: Partial<WorkflowStep> | null;
  departments: Department[];
  stepDefinitions: StepDefinition[];
  onSave: (data: Partial<WorkflowStep>) => void;
  saving: boolean;
}) {
  const [selectedDefId, setSelectedDefId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [stepType, setStepType] = useState("review");
  const [order, setOrder] = useState(1);
  const [deptId, setDeptId] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [allowParallelApprovals, setAllowParallelApprovals] = useState(false);
  const [allowReturnForInfo, setAllowReturnForInfo] = useState(false);
  const [autoMoveOnSuccess, setAutoMoveOnSuccess] = useState(false);

  const activeDefinitions = stepDefinitions.filter(d => d.is_active);

  useEffect(() => {
    if (open && step) {
      setSelectedDefId("");
      setName("");
      setCode("");
      setStepType("review");
      setOrder(step.step_order || 1);
      setDeptId("");
      setIsRequired(false);
      setAllowParallelApprovals(false);
      setAllowReturnForInfo(false);
      setAutoMoveOnSuccess(false);
    }
  }, [open, step]);

  const handleDefChange = (defId: string) => {
    setSelectedDefId(defId);
    const def = stepDefinitions.find(d => d.id === defId);
    if (def) {
      setName(def.name);
      setCode(def.code);
      setStepType(def.step_type);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة خطوة جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Definition selector */}
          <div>
            <Label>اختر الخطوة من المكتبة</Label>
            <Select value={selectedDefId} onValueChange={handleDefChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="اختر خطوة..." />
              </SelectTrigger>
              <SelectContent>
                {activeDefinitions.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name} <span className="text-muted-foreground">({def.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Read-only info from definition */}
          {selectedDefId && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">الاسم</Label>
                <p className="text-sm font-medium mt-0.5">{name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">الكود</Label>
                <p className="text-sm font-mono mt-0.5">{code}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">النوع</Label>
                <p className="text-sm mt-0.5">{STEP_TYPE_LABELS[stepType] || stepType}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* User-configurable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الترتيب</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} min={1} className="mt-1" />
            </div>
            <div>
              <Label>القسم المسؤول</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختياري" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون قسم</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-y-3">
            <div className="flex items-center justify-between pl-4">
              <Label className="text-sm">مطلوبة</Label>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
            <div className="flex items-center justify-between pl-4">
              <Label className="text-sm">اعتماد متوازي</Label>
              <Switch checked={allowParallelApprovals} onCheckedChange={setAllowParallelApprovals} />
            </div>
            <div className="flex items-center justify-between pl-4">
              <Label className="text-sm">إرجاع للاستفسار</Label>
              <Switch checked={allowReturnForInfo} onCheckedChange={setAllowReturnForInfo} />
            </div>
            <div className="flex items-center justify-between pl-4">
              <Label className="text-sm">انتقال تلقائي</Label>
              <Switch checked={autoMoveOnSuccess} onCheckedChange={setAutoMoveOnSuccess} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() =>
              onSave({
                workflow_template_id: step?.workflow_template_id || "",
                name,
                code,
                step_type: stepType,
                step_order: order,
                department_id: deptId && deptId !== "none" ? deptId : null,
                is_required: isRequired,
                allow_parallel_approvals: allowParallelApprovals,
                allow_return_for_info: allowReturnForInfo,
                auto_move_on_success: autoMoveOnSuccess,
              })
            }
            disabled={!name.trim() || !code.trim() || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            إضافة الخطوة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════
// Template Sheet (Drawer-style editor)
// ══════════════════════════════════════════════════════
const AR_EN_MAP: Record<string, string> = {
  "سداد": "payment", "فواتير": "bill", "فاتورة": "bill", "كهرباء": "electricity",
  "مياه": "water", "غاز": "gas", "إيجار": "rent", "صيانة": "maintenance",
  "شكوى": "complaint", "شكاوى": "complaints", "طلب": "request", "تحويل": "transfer",
  "اعتماد": "approval", "مراجعة": "review", "تقييم": "evaluation", "تدقيق": "audit",
  "إغلاق": "closure", "فتح": "opening", "تسجيل": "registration", "متابعة": "followup",
  "دعم": "support", "مساعدة": "assistance", "إسكان": "housing", "تأهيل": "rehabilitation",
  "تعليم": "education", "صحة": "health", "علاج": "treatment", "مالي": "financial",
  "مالية": "financial", "قانوني": "legal", "قانونية": "legal", "اجتماعي": "social",
  "اجتماعية": "social", "نفسي": "psychological", "نفسية": "psychological",
  "عام": "general", "عامة": "general", "خاص": "special", "خاصة": "special",
  "إداري": "administrative", "إدارية": "administrative", "فني": "technical", "فنية": "technical",
  "مستفيد": "beneficiary", "مستفيدين": "beneficiaries", "حالة": "case", "حالات": "cases",
  "موظف": "employee", "موظفين": "employees", "قسم": "department", "أقسام": "departments",
  "فرع": "branch", "فروع": "branches", "جهة": "organization",
  "ترقية": "promotion", "نقل": "relocation", "إجازة": "leave", "راتب": "salary",
  "مكافأة": "bonus", "تدريب": "training", "توظيف": "hiring",
  "عاجل": "urgent", "عاجلة": "urgent", "إنساني": "humanitarian", "إنسانية": "humanitarian",
  "طوارئ": "emergency", "طارئ": "emergency", "طارئة": "emergency",
  "تقرير": "report", "تقارير": "reports", "ميزانية": "budget", "مشروع": "project",
  "مشاريع": "projects", "عقد": "contract", "عقود": "contracts",
  "شراء": "purchase", "مشتريات": "procurement", "مخزون": "inventory",
  "بيع": "sales", "تسويق": "marketing", "خدمة": "service", "خدمات": "services",
  "زيارة": "visit", "زيارات": "visits", "اتصال": "contact", "اتصالات": "communications",
  "تحقيق": "investigation", "فحص": "inspection", "اختبار": "testing",
  "ضمان": "warranty", "كفالة": "guarantee", "تأمين": "insurance",
  "إعانة": "subsidy", "إعانات": "subsidies", "منحة": "grant", "منح": "grants",
};

const STOP_WORDS = new Set([
  "مسار", "مسارات", "طلبات", "الحالات", "نظام", "إدارة",
  "ال", "في", "من", "إلى", "على", "عن", "مع", "هذا", "هذه",
  "ذلك", "تلك", "أو", "و", "ثم", "لكن", "بل", "حتى",
]);

const IS_LATIN = /^[a-zA-Z0-9_]+$/;

function generateWorkflowCode(text: string): string {
  if (!text.trim()) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  const translated: string[] = [];
  for (const raw of words) {
    const cleaned = raw.replace(/^ال/, "");
    if (STOP_WORDS.has(raw) || STOP_WORDS.has(cleaned)) continue;
    const eng = AR_EN_MAP[raw] || AR_EN_MAP[cleaned];
    if (eng) {
      translated.push(eng.toLowerCase());
    } else if (IS_LATIN.test(raw)) {
      translated.push(raw.toLowerCase());
    }
  }
  if (translated.length === 0) return "custom_workflow";
  const code = translated.join("_").replace(/_{2,}/g, "_") + "_workflow";
  return code;
}

function TemplateSheet({
  open, onOpenChange, template, caseTypes, onSave, saving, existingCodes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: WorkflowTemplate | null;
  caseTypes: CaseType[];
  onSave: (data: { id?: string; name: string; code: string; case_type_id: string | null; is_active: boolean }) => void;
  saving: boolean;
  existingCodes: string[];
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [caseTypeId, setCaseTypeId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [manuallyEdited, setManuallyEdited] = useState(false);

  useEffect(() => {
    if (open && template) {
      setName(template.name);
      setCode(template.code);
      setCaseTypeId(template.case_type_id || "");
      setIsActive(template.is_active);
      setManuallyEdited(true);
    } else if (open) {
      setName("");
      setCode("");
      setCaseTypeId("");
      setIsActive(true);
      setManuallyEdited(false);
    }
  }, [open, template]);

  useEffect(() => {
    if (!manuallyEdited && !template) {
      setCode(generateWorkflowCode(name));
    }
  }, [name, manuallyEdited, template]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
    setManuallyEdited(true);
  };

  const handleRegenerate = () => {
    setCode(generateWorkflowCode(name));
    setManuallyEdited(false);
  };

  const isDuplicate = code.trim() !== "" && existingCodes.filter(c => c === code.trim()).length > (template ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg" dir="rtl">
        <SheetHeader>
          <SheetTitle>{template ? "تعديل المسار" : "إنشاء مسار جديد"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div>
            <Label>اسم المسار</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مسار الحالات العامة" className="mt-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>كود المسار</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-primary"
                onClick={handleRegenerate}
              >
                <GitBranch className="h-3 w-3" />
                توليد تلقائي
              </Button>
            </div>
            <Input
              value={code}
              onChange={handleCodeChange}
              placeholder="electricity_bill_payment_workflow"
              className="font-mono"
            />
            {isDuplicate && (
              <p className="text-xs text-destructive mt-1">هذا الكود مستخدم بالفعل، اختر كودًا مختلفًا</p>
            )}
          </div>
          <div>
            <Label>نوع الحالة المرتبط</Label>
            <Select value={caseTypeId} onValueChange={setCaseTypeId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="اختر نوع الحالة" />
              </SelectTrigger>
              <SelectContent>
                {caseTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>نشط</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Separator />

          <Button
            className="w-full"
            onClick={() => onSave({ id: template?.id, name, code, case_type_id: caseTypeId || null, is_active: isActive })}
            disabled={!name.trim() || !code.trim() || isDuplicate || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            {template ? "حفظ التعديلات" : "إنشاء المسار"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════
// Step Definitions Library
// ══════════════════════════════════════════════════════
// ── Arabic to English dictionary for code generation ──
const AR_EN_DICT: Record<string, string> = {
  "اعتماد": "approval", "دراسة": "study", "استقبال": "intake", "تنفيذ": "execution",
  "إغلاق": "closure", "تحويل": "assignment", "مراجعة": "review", "حالة": "case",
  "مدير": "manager", "مالي": "finance", "فحص": "inspection", "تقييم": "evaluation",
  "تسجيل": "registration", "قبول": "acceptance", "رفض": "rejection", "إحالة": "referral",
  "متابعة": "followup", "تحقق": "verification", "توثيق": "documentation",
  "إشعار": "notification", "تقرير": "report", "صرف": "disbursement", "سداد": "payment",
  "فاتورة": "invoice", "طلب": "request", "حالات": "cases", "إنسانية": "humanitarian",
  "عاجلة": "urgent", "كهرباء": "electricity", "فواتير": "bills", "مساعدة": "assistance",
  "تدقيق": "audit", "نهائي": "final", "أولي": "initial", "إداري": "administrative",
  "فني": "technical", "ميداني": "field", "اجتماعي": "social", "طبي": "medical",
  "قانوني": "legal", "إرجاع": "return", "تأكيد": "confirmation",
};

const AR_STOP_WORDS = new Set(["ال", "الـ", "في", "من", "إلى", "على", "عن", "مع", "هذا", "هذه", "ذلك", "تلك", "التي", "الذي", "و", "أو", "ثم", "لا", "لم", "لن", "قد", "عند", "بعد", "قبل", "كل", "بين", "حتى"]);

function generateStepCode(arabicName: string): string {
  if (!arabicName.trim()) return "";
  // Remove ال prefix, diacritics
  let text = arabicName.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, "");
  // Split words
  const words = text.split(/\s+/).filter(Boolean);
  const englishParts: string[] = [];

  for (const word of words) {
    const cleaned = word.replace(/^ال/, "").trim();
    if (!cleaned || AR_STOP_WORDS.has(word) || AR_STOP_WORDS.has(cleaned)) continue;
    // Check dictionary
    const found = AR_EN_DICT[cleaned] || AR_EN_DICT[word] || AR_EN_DICT[word.replace(/^ال/, "")];
    if (found) {
      englishParts.push(found);
    } else {
      // Simple transliteration fallback
      const translit = simpleTransliterate(cleaned);
      if (translit && /^[a-z]+$/.test(translit)) {
        englishParts.push(translit);
      }
    }
  }

  if (englishParts.length === 0) return "step";
  return englishParts.join("_").toLowerCase().replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
}

function simpleTransliterate(text: string): string {
  const map: Record<string, string> = {
    "ا":"a","أ":"a","إ":"i","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh",
    "د":"d","ذ":"dh","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z",
    "ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"w",
    "ي":"y","ى":"a","ة":"a","ء":"","ؤ":"w","ئ":"y",
  };
  let result = "";
  for (const ch of text) {
    result += map[ch] ?? ch;
  }
  return result.replace(/[^a-z0-9]/g, "");
}

function StepDefinitionsLibrary() {
  const { data: definitions, isLoading } = useStepDefinitions();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          مكتبة خطوات المسارات
        </CardTitle>
        <Button size="sm" disabled className="gap-1.5" title="إضافة تعريف جديد غير متاحة حالياً">
          <Plus className="h-4 w-4" />
          خطوة جديدة
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          مكتبة خطوات المسارات عامة، وإضافة تعريفات جديدة تتطلب تهيئة صلاحيات أو إدارة من المنصة لاحقًا.
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !definitions?.length ? (
          <div className="text-center py-12 space-y-2">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">لا توجد خطوات معرّفة</p>
            <Button variant="outline" size="sm" disabled title="إضافة تعريف جديد غير متاحة حالياً">
              <Plus className="h-4 w-4 ml-1" />
              إضافة التعريفات غير متاحة
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map((def) => (
                <TableRow key={def.id}>
                  <TableCell className="font-medium">{def.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{def.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {STEP_TYPE_LABELS[def.step_type] || def.step_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={def.is_active ? "default" : "secondary"} className="text-xs">
                      {def.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
