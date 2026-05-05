import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCase } from "@/hooks/useCases";
import { useBeneficiary, useBeneficiaryStats, useBeneficiaryCases } from "@/hooks/useBeneficiaries";
import { useCaseClosure } from "@/hooks/useCaseClosures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, Loader2, Calendar, User, Building2, FileText, Hash, Tag,
  AlertCircle, Plus, Phone, CreditCard, MapPin, ExternalLink, Banknote,
  XCircle, CheckCircle2,
} from "lucide-react";
import { CaseActionDialog } from "@/components/cases/CaseActionDialog";
import { CloseCaseSheet } from "@/components/cases/CloseCaseSheet";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { WorkflowStepper } from "@/components/cases/WorkflowStepper";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useWorkflowSteps, findStepById as findStepByUUID } from "@/hooks/useWorkflowSteps";
import { getAllowedActionsByCode } from "@/config/workflowSteps";
import { useHasPermission } from "@/hooks/usePermissions";

export default function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading, error } = useCase(id!);
  const { data: workflowSteps } = useWorkflowSteps();
  const [actionOpen, setActionOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const { hasPermission } = useHasPermission();

  // Beneficiary data
  const beneficiaryId = caseData?.beneficiary_id;
  const { data: beneficiary } = useBeneficiary(beneficiaryId || undefined);
  const { data: beneficiaryStats } = useBeneficiaryStats(beneficiaryId || undefined);
  const { data: beneficiaryCases } = useBeneficiaryCases(beneficiaryId || undefined);

  // Closure data
  const { data: closureData } = useCaseClosure(id);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatCurrency = (n?: number | null, emptyLabel = "—") => {
    if (n == null) return emptyLabel;
    return `${n.toLocaleString("ar-SA")} ريال`;
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    low: "bg-muted text-muted-foreground border-border",
  };

  const getPriorityClass = (code?: string) => {
    if (!code) return "bg-muted text-muted-foreground border-border";
    return priorityColors[code.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive text-sm">لم يتم العثور على الحالة</p>
        <Button variant="outline" onClick={() => navigate("/cases")}>العودة للقائمة</Button>
      </div>
    );
  }

  const c = caseData;
  const isClosed = !!c.closed_at;
  const currentStepId = c.current_step_id || "";
  const currentStep = workflowSteps ? findStepByUUID(workflowSteps, currentStepId) : null;
  const currentStepCode = currentStep?.code || "";
  const allActions = getAllowedActionsByCode(currentStepCode);
  const permittedActions = allActions.filter((a) => hasPermission(a.permissionCode));
  const hasActions = permittedActions.length > 0;

  // Parse closure notes JSON for extra info
  const closureNotesObj = (() => {
    if (!closureData?.notes) return null;
    try { return JSON.parse(closureData.notes); } catch { return { text: closureData.notes }; }
  })();

  // Previous cases excluding current
  const otherCases = (beneficiaryCases || []).filter((bc: any) => bc.id !== c.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cases")} className="mt-0.5">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{c.title}</h1>
              {c.is_urgent && <Badge variant="destructive" className="text-xs">عاجل</Badge>}
              {c.is_confidential && <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">سري</Badge>}
              {isClosed && <Badge variant="outline" className="text-xs border-green-500/30 text-green-600">مغلقة</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{c.case_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setClosureOpen(true)}>
              <XCircle className="h-3.5 w-3.5" />
              إغلاق الحالة
            </Button>
          )}
          {hasActions && !isClosed && (
            <Button variant="default" size="sm" className="gap-1.5" onClick={() => setActionOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              إجراء جديد
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Stepper */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">مسار الحالة</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowStepper currentStepId={currentStepId} />
          <p className="text-xs text-muted-foreground mt-3">
            المرحلة الحالية: <span className="font-semibold text-foreground">{currentStep?.name || "غير محددة"}</span>
          </p>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {c.status && <Badge variant="secondary" className="text-sm px-3 py-1">{c.status.name}</Badge>}
        {c.priority && <Badge variant="outline" className={`text-sm px-3 py-1 ${getPriorityClass(c.priority.code)}`}>{c.priority.name}</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                المعلومات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {c.subject && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الموضوع</p>
                  <p className="text-sm text-foreground">{c.subject}</p>
                </div>
              )}
              {c.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الوصف</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.description}</p>
                </div>
              )}
              {!c.subject && !c.description && (
                <p className="text-sm text-muted-foreground">لا توجد تفاصيل إضافية</p>
              )}
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                التصنيف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="نوع الحالة" value={c.case_type?.name} />
                <InfoItem label="مصدر الحالة" value={c.case_source?.name} />
                <InfoItem label="الأولوية" value={c.priority?.name} />
                <InfoItem label="الحالة النظامية" value={c.status?.name} />
                <InfoItem label="القسم" value={c.department?.name} />
                <InfoItem label="القسم الحالي" value={c.current_department?.name} />
              </div>
            </CardContent>
          </Card>

          {/* Financial Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" />
                المعلومات المالية والمرجعية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="المبلغ المطلوب" value={formatCurrency(c.requested_amount)} />
                <InfoItem label="المبلغ المعتمد" value={formatCurrency(c.approved_amount, "غير محدد")} />
                <InfoItem label="الجهة المصدرة" value={c.source_entity_name} />
                <InfoItem label="الرقم المرجعي" value={c.official_reference_number} />
                <InfoItem label="تاريخ المرجع" value={formatDate(c.official_reference_date)} />
              </div>
            </CardContent>
          </Card>

          {/* Closure Info Card */}
          {isClosed && closureData && (
            <Card className="border-green-500/20 bg-green-50/30 dark:bg-green-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  المعلومات المالية للإغلاق
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem
                    label="مبلغ الدعم المصروف النهائي"
                    value={closureData.final_amount != null ? formatCurrency(closureData.final_amount) : "لم يتم تسجيل مبلغ مصروف"}
                  />
                  <InfoItem label="سبب الإغلاق" value={closureData.closure_reason || "غير متوفر"} />
                  <InfoItem label="تاريخ الإغلاق" value={formatDateTime(closureData.created_at)} />
                  <InfoItem label="منفذ الإغلاق" value={closureData.closed_by_user?.full_name} />
                  {closureNotesObj?.reference_number && (
                    <InfoItem label="رقم السند / المرجع المالي" value={closureNotesObj.reference_number} />
                  )}
                  {closureNotesObj?.disbursement_date && (
                    <InfoItem label="تاريخ الصرف" value={formatDate(closureNotesObj.disbursement_date)} />
                  )}
                  {closureNotesObj?.executing_entity && (
                    <InfoItem label="الجهة المنفذة / وسيلة الصرف" value={closureNotesObj.executing_entity} />
                  )}
                  {closureNotesObj?.text && (
                    <div className="sm:col-span-2">
                      <InfoItem label="ملخص الإغلاق" value={closureNotesObj.text || "غير متوفر"} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Beneficiary's Previous Cases */}
          {otherCases.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">الحالات السابقة للمستفيد</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-right">رقم الحالة</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherCases.map((bc: any) => (
                        <TableRow key={bc.id}>
                          <TableCell className="font-mono text-xs">{bc.case_number}</TableCell>
                          <TableCell className="text-sm">{bc.case_type?.name || "—"}</TableCell>
                          <TableCell>
                            {bc.status ? <Badge variant="secondary" className="text-xs">{bc.status.name}</Badge> : "—"}
                          </TableCell>
                          <TableCell className="text-sm">{formatCurrency(bc.requested_amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(bc.created_at)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/cases/${bc.id}`)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <AttachmentsPanel caseId={c.id} />

          {/* Timeline */}
          <CaseTimeline caseId={c.id} createdAt={c.created_at} createdByName={c.created_by_user?.full_name} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Beneficiary Card */}
          {beneficiary && (
            <Card className="bg-accent/20 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  المستفيد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-sm">{beneficiary.full_name}</p>
                  <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {beneficiary.mobile}
                    </span>
                    {beneficiary.national_id && (
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" /> {beneficiary.national_id}
                      </span>
                    )}
                    {beneficiary.city && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {beneficiary.city}
                      </span>
                    )}
                  </div>
                </div>

                {beneficiaryStats && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{beneficiaryStats.total_cases}</p>
                        <p className="text-[10px] text-muted-foreground">إجمالي الحالات</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{beneficiaryStats.open_cases}</p>
                        <p className="text-[10px] text-muted-foreground">حالات مفتوحة</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{formatCurrency(beneficiaryStats.total_approved)}</p>
                        <p className="text-[10px] text-muted-foreground">الدعم المعتمد</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{formatCurrency(beneficiaryStats.total_disbursed)}</p>
                        <p className="text-[10px] text-muted-foreground">المصروف</p>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => navigate(`/beneficiaries/${beneficiary.id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                  فتح ملف المستفيد
                </Button>
              </CardContent>
            </Card>
          )}

          {/* System Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                معلومات النظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem label="تاريخ الإنشاء" value={formatDateTime(c.created_at)} />
              <Separator />
              <InfoItem label="آخر تحديث" value={formatDateTime(c.updated_at)} />
              <Separator />
              <InfoItem label="أنشأ بواسطة" value={c.created_by_user?.full_name} icon={<User className="h-3.5 w-3.5 text-muted-foreground" />} />
              <Separator />
              <InfoItem label="المسؤول الحالي" value={c.current_owner_user?.full_name} icon={<User className="h-3.5 w-3.5 text-muted-foreground" />} />
              {isClosed && (
                <>
                  <Separator />
                  <InfoItem label="تاريخ الإغلاق" value={formatDateTime(c.closed_at)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Branch & Department */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                الفرع والقسم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem label="الفرع" value={c.branch?.name} />
              <Separator />
              <InfoItem label="القسم" value={c.department?.name} />
              <Separator />
              <InfoItem label="القسم الحالي" value={c.current_department?.name} />
            </CardContent>
          </Card>
        </div>
      </div>

      <CaseActionDialog open={actionOpen} onOpenChange={setActionOpen} caseId={c.id} currentStepId={currentStepId} />
      <CloseCaseSheet open={closureOpen} onOpenChange={setClosureOpen} caseId={c.id} />
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}
