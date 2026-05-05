import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateCase, useCaseLookups } from "@/hooks/useCases";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { BeneficiarySearch } from "@/components/beneficiaries/BeneficiarySearch";
import { BeneficiaryCard } from "@/components/beneficiaries/BeneficiaryCard";
import { CreateBeneficiarySheet } from "@/components/beneficiaries/CreateBeneficiarySheet";
import type { Beneficiary } from "@/hooks/useBeneficiaries";
import type { CaseFormData } from "@/types/cases";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBeneficiaryId?: string;
}

export function CreateCaseDialog({ open, onOpenChange, preselectedBeneficiaryId }: Props) {
  const { toast } = useToast();
  const createCase = useCreateCase();
  const { caseTypes, caseSources, priorities, departments } = useCaseLookups();
  const { currentMembership } = useOrganization();
  const orgId = currentMembership?.organization_id;

  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showCreateBeneficiary, setShowCreateBeneficiary] = useState(false);
  const [workflowWarning, setWorkflowWarning] = useState<string | null>(null);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  const [form, setForm] = useState<CaseFormData>({
    title: "",
    subject: "",
    description: "",
    case_type_id: undefined,
    case_source_id: undefined,
    priority_id: undefined,
    status_id: undefined,
    department_id: undefined,
    source_entity_name: "",
    official_reference_number: "",
    official_reference_date: "",
    requested_amount: undefined,
    beneficiary_full_name: "",
    beneficiary_mobile: "",
  });

  // Load preselected beneficiary
  useEffect(() => {
    if (preselectedBeneficiaryId && orgId && open) {
      supabase
        .from("beneficiaries")
        .select("*")
        .eq("id", preselectedBeneficiaryId)
        .eq("organization_id", orgId)
        .single()
        .then(({ data }) => {
          if (data) setSelectedBeneficiary(data as Beneficiary);
        });
    }
  }, [preselectedBeneficiaryId, orgId, open]);

  // Set defaults when lookup data loads
  useEffect(() => {
    if (priorities.data?.length && !form.priority_id) {
      setForm((prev) => ({ ...prev, priority_id: priorities.data![0].id }));
    }
  }, [priorities.data]);

  // Check workflow when case type changes
  useEffect(() => {
    if (!form.case_type_id || !orgId) {
      setWorkflowWarning(null);
      return;
    }
    supabase
      .from("workflow_templates")
      .select("id")
      .eq("organization_id", orgId)
      .eq("case_type_id", form.case_type_id)
      .eq("is_active", true)
      .limit(1)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setWorkflowWarning("لا يوجد مسار معتمد لهذا النوع من الحالات. سيتم إنشاء الحالة بدون مسار.");
        } else {
          setWorkflowWarning(null);
        }
      });
  }, [form.case_type_id, orgId]);

  const updateField = <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectBeneficiary = (b: Beneficiary) => {
    setSelectedBeneficiary(b);
    setForm((prev) => ({
      ...prev,
      beneficiary_full_name: b.full_name,
      beneficiary_mobile: b.mobile,
    }));
  };

  const handleBeneficiaryCreated = (b: Beneficiary) => {
    handleSelectBeneficiary(b);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeneficiary) {
      toast({ title: "خطأ", description: "يرجى اختيار المستفيد أولاً", variant: "destructive" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "خطأ", description: "عنوان الحالة مطلوب", variant: "destructive" });
      return;
    }
    if (!form.priority_id) {
      toast({ title: "خطأ", description: "الأولوية مطلوبة", variant: "destructive" });
      return;
    }

    try {
      const formWithBeneficiary = {
        ...form,
        beneficiary_full_name: selectedBeneficiary.full_name,
        beneficiary_mobile: selectedBeneficiary.mobile,
      };
      await createCase.mutateAsync(formWithBeneficiary);
      toast({ title: "تم", description: "تم إنشاء الحالة بنجاح" });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل إنشاء الحالة", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSelectedBeneficiary(null);
    setWorkflowWarning(null);
    setForm({
      title: "", subject: "", description: "",
      priority_id: priorities.data?.[0]?.id,
      beneficiary_full_name: "", beneficiary_mobile: "",
    });
  };

  const NONE = "__none__";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">إضافة حالة جديدة</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Beneficiary Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b border-border pb-1">المستفيد</h3>
              {selectedBeneficiary ? (
                <BeneficiaryCard
                  beneficiary={selectedBeneficiary}
                  onRemove={() => {
                    setSelectedBeneficiary(null);
                    setForm((prev) => ({ ...prev, beneficiary_full_name: "", beneficiary_mobile: "" }));
                  }}
                />
              ) : (
                <BeneficiarySearch
                  onSelect={handleSelectBeneficiary}
                  onCreateNew={() => setShowCreateBeneficiary(true)}
                />
              )}
            </div>

            {/* Case Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b border-border pb-1">بيانات الحالة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="title">عنوان الحالة *</Label>
                  <Input id="title" value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="أدخل عنوان الحالة" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea id="description" value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} placeholder="وصف تفصيلي للحالة" rows={3} />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b border-border pb-1">التصنيف</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>نوع الحالة</Label>
                  <Select value={form.case_type_id || NONE} onValueChange={(v) => updateField("case_type_id", v === NONE ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— غير محدد —</SelectItem>
                      {caseTypes.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الأولوية *</Label>
                  {priorities.isLoading ? (
                    <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
                  ) : priorities.data?.length === 0 ? (
                    <p className="text-xs text-destructive">⚠ لم يتم تحميل الأولويات</p>
                  ) : (
                    <Select value={form.priority_id || ""} onValueChange={(v) => updateField("priority_id", v)}>
                      <SelectTrigger><SelectValue placeholder="اختر الأولوية" /></SelectTrigger>
                      <SelectContent>
                        {priorities.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label>القسم</Label>
                  <Select value={form.department_id || NONE} onValueChange={(v) => updateField("department_id", v === NONE ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— غير محدد —</SelectItem>
                      {departments.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">المبلغ المطلوب</Label>
                  <Input id="amount" type="number" value={form.requested_amount ?? ""} onChange={(e) => updateField("requested_amount", e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
                </div>
              </div>

              {workflowWarning && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{workflowWarning}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              <Button type="button" variant="ghost" className="w-full justify-between px-0" onClick={() => setShowAdditionalInfo((s) => !s)}>
                <span className="text-sm font-semibold text-muted-foreground">معلومات إضافية</span>
                {showAdditionalInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {showAdditionalInfo && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>مصدر الحالة</Label>
                  <Select value={form.case_source_id || NONE} onValueChange={(v) => updateField("case_source_id", v === NONE ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المصدر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— غير محدد —</SelectItem>
                      {caseSources.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source_entity">الجهة المصدرة</Label>
                  <Input id="source_entity" value={form.source_entity_name || ""} onChange={(e) => updateField("source_entity_name", e.target.value)} placeholder="اسم الجهة المصدرة" />
                </div>
                <div>
                  <Label htmlFor="ref_number">الرقم المرجعي</Label>
                  <Input id="ref_number" value={form.official_reference_number || ""} onChange={(e) => updateField("official_reference_number", e.target.value)} placeholder="رقم مرجعي رسمي" />
                </div>
                <div>
                  <Label htmlFor="ref_date">تاريخ المرجع</Label>
                  <Input id="ref_date" type="date" value={form.official_reference_date || ""} onChange={(e) => updateField("official_reference_date", e.target.value)} />
                </div>
              </div>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>إلغاء</Button>
              <Button type="submit" disabled={createCase.isPending || !selectedBeneficiary}>
                {createCase.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                حفظ الحالة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CreateBeneficiarySheet
        open={showCreateBeneficiary}
        onOpenChange={setShowCreateBeneficiary}
        onCreated={handleBeneficiaryCreated}
      />
    </>
  );
}
