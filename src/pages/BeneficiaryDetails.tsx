import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBeneficiary, useBeneficiaryStats, useBeneficiaryCases, useUpdateBeneficiary } from "@/hooks/useBeneficiaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, Loader2, User, Phone, CreditCard, MapPin, ExternalLink,
  Plus, Edit, Save, X, Banknote, FolderOpen, Calendar,
} from "lucide-react";
import { CreateCaseDialog } from "@/components/cases/CreateCaseDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const MOBILE_ERROR = "رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05";
const NATIONAL_ID_ERROR = "رقم الهوية يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2";
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const isValidMobile = (mobile: string) => /^05\d{8}$/.test(mobile);
const isValidNationalId = (nationalId: string) => /^[12]\d{9}$/.test(nationalId);

export default function BeneficiaryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: beneficiary, isLoading, error } = useBeneficiary(id);
  const { data: stats } = useBeneficiaryStats(id);
  const { data: cases } = useBeneficiaryCases(id);
  const updateMutation = useUpdateBeneficiary();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<{ mobile?: string; national_id?: string }>({});
  const [showCreateCase, setShowCreateCase] = useState(false);

  const caseIds = (cases || []).map((c: any) => c.id);
  const { data: closuresMap } = useQuery({
    queryKey: ["beneficiary_closures", id, caseIds],
    enabled: caseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_closures")
        .select("case_id, final_amount")
        .in("case_id", caseIds);
      if (error) {
        console.error("[BeneficiaryClosures] Error:", error);
        return {} as Record<string, number | null>;
      }
      const map: Record<string, number | null> = {};
      (data || []).forEach((cl: any) => {
        if (!(cl.case_id in map) || (cl.final_amount != null)) {
          map[cl.case_id] = cl.final_amount;
        }
      });
      return map;
    },
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatCurrency = (n?: number | null) => {
    if (n == null) return "—";
    return `${n.toLocaleString("ar-SA")} ريال`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !beneficiary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <User className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">لم يتم العثور على المستفيد</p>
        <Button variant="outline" onClick={() => navigate("/beneficiaries")}>العودة للقائمة</Button>
      </div>
    );
  }

  const b = beneficiary;

  const startEditing = () => {
    setEditForm({
      full_name: b.full_name || "",
      mobile: b.mobile || "",
      national_id: b.national_id || "",
      gender: b.gender || "",
      birth_date: b.birth_date || "",
      city: b.city || "",
      district: b.district || "",
      address: b.address || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    const nextErrors: { mobile?: string; national_id?: string } = {};
    if (!editForm.mobile?.trim() || !isValidMobile(editForm.mobile.trim())) {
      nextErrors.mobile = MOBILE_ERROR;
    }
    if (editForm.national_id?.trim() && !isValidNationalId(editForm.national_id.trim())) {
      nextErrors.national_id = NATIONAL_ID_ERROR;
    }
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({ title: "خطأ", description: "يرجى تصحيح بيانات الجوال/الهوية قبل الحفظ", variant: "destructive" });
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: b.id, data: editForm });
      toast({ title: "تم", description: "تم تحديث بيانات المستفيد" });
      setEditing(false);
    } catch (err: any) {
      console.error("[BeneficiaryEdit] Error:", err);
      const msg = err?.message || "";
      const description = msg.includes("duplicate") || msg.includes("unique")
        ? "يوجد مستفيد بنفس رقم الجوال"
        : "تعذر تحديث بيانات المستفيد، يرجى المحاولة مرة أخرى";
      toast({ title: "خطأ", description, variant: "destructive" });
    }
  };

  const NONE = "__none__";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/beneficiaries")} className="mt-0.5">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{b.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{b.mobile}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreateCase(true)}>
            <Plus className="h-3.5 w-3.5" />
            إنشاء حالة جديدة
          </Button>
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
              <Edit className="h-3.5 w-3.5" />
              تعديل البيانات
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
                إلغاء
              </Button>
              <Button size="sm" className="gap-1.5" onClick={saveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                حفظ
              </Button>
            </>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="إجمالي الحالات" value={String(stats.total_cases)} />
          <StatCard label="حالات مفتوحة" value={String(stats.open_cases)} />
          <StatCard label="الدعم المعتمد" value={formatCurrency(stats.total_approved)} />
          <StatCard label="المصروف فعلياً" value={formatCurrency(stats.total_disbursed)} />
          <StatCard label="آخر دعم" value={stats.last_support_date ? formatDate(stats.last_support_date) : "—"} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                البيانات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">الاسم الكامل</Label>
                    <Input value={editForm.full_name} onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">الجوال</Label>
                    <Input value={editForm.mobile} onChange={(e) => {
                      const value = digitsOnly(e.target.value).slice(0, 10);
                      setEditForm(p => ({ ...p, mobile: value }));
                      setEditErrors((prev) => ({ ...prev, mobile: !value || isValidMobile(value) ? undefined : MOBILE_ERROR }));
                    }} dir="ltr" inputMode="numeric" maxLength={10} />
                    {editErrors.mobile && <p className="text-xs text-destructive mt-1">{editErrors.mobile}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">رقم الهوية</Label>
                    <Input value={editForm.national_id} onChange={(e) => {
                      const value = digitsOnly(e.target.value).slice(0, 10);
                      setEditForm(p => ({ ...p, national_id: value }));
                      setEditErrors((prev) => ({ ...prev, national_id: !value || isValidNationalId(value) ? undefined : NATIONAL_ID_ERROR }));
                    }} dir="ltr" inputMode="numeric" maxLength={10} />
                    {editErrors.national_id && <p className="text-xs text-destructive mt-1">{editErrors.national_id}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">الجنس</Label>
                    <Select value={editForm.gender || NONE} onValueChange={(v) => setEditForm(p => ({ ...p, gender: v === NONE ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— غير محدد —</SelectItem>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">تاريخ الميلاد</Label>
                    <Input type="date" value={editForm.birth_date} onChange={(e) => setEditForm(p => ({ ...p, birth_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">المدينة</Label>
                    <Input value={editForm.city} onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">الحي</Label>
                    <Input value={editForm.district} onChange={(e) => setEditForm(p => ({ ...p, district: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">العنوان</Label>
                    <Input value={editForm.address} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <>
                  <ProfileField icon={<Phone className="h-3.5 w-3.5" />} label="الجوال" value={b.mobile} />
                  <Separator />
                  <ProfileField icon={<CreditCard className="h-3.5 w-3.5" />} label="رقم الهوية" value={b.national_id} />
                  <Separator />
                  <ProfileField label="الجنس" value={b.gender === "male" ? "ذكر" : b.gender === "female" ? "أنثى" : undefined} />
                  <Separator />
                  <ProfileField icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ الميلاد" value={b.birth_date ? formatDate(b.birth_date) : undefined} />
                  <Separator />
                  <ProfileField icon={<MapPin className="h-3.5 w-3.5" />} label="المدينة" value={b.city} />
                  <Separator />
                  <ProfileField label="الحي" value={b.district} />
                  <Separator />
                  <ProfileField label="العنوان" value={b.address} />
                  <Separator />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                الحالات المرتبطة
                {cases && <Badge variant="secondary" className="text-xs mr-2">{cases.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!cases?.length ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <FolderOpen className="h-8 w-8" />
                  <p className="text-sm">لا توجد حالات مرتبطة</p>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateCase(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    إنشاء أول حالة
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-right">رقم الحالة</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">المبلغ المطلوب</TableHead>
                        <TableHead className="text-right">المبلغ المعتمد</TableHead>
                        <TableHead className="text-right">المصروف</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((c: any) => {
                        const disbursed = closuresMap?.[c.id];
                        return (
                          <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/cases/${c.id}`)}>
                            <TableCell className="font-mono text-xs">{c.case_number}</TableCell>
                            <TableCell className="text-sm">{c.case_type?.name || "—"}</TableCell>
                            <TableCell>
                              {c.status ? <Badge variant="secondary" className="text-xs">{c.status.name}</Badge> : "—"}
                            </TableCell>
                            <TableCell className="text-sm">{formatCurrency(c.requested_amount)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(c.approved_amount)}</TableCell>
                            <TableCell className="text-sm">{disbursed != null ? formatCurrency(disbursed) : "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateCaseDialog open={showCreateCase} onOpenChange={setShowCreateCase} preselectedBeneficiaryId={b.id} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProfileField({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}
