import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBeneficiary, type BeneficiaryFormData, type Beneficiary } from "@/hooks/useBeneficiaries";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const MOBILE_ERROR = "رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05";
const NATIONAL_ID_ERROR = "رقم الهوية يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2";

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const isValidMobile = (mobile: string) => /^05\d{8}$/.test(mobile);
const isValidNationalId = (nationalId: string) => /^[12]\d{9}$/.test(nationalId);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (b: Beneficiary) => void;
  initialMobile?: string;
  initialName?: string;
}

export function CreateBeneficiarySheet({ open, onOpenChange, onCreated, initialMobile, initialName }: Props) {
  const { toast } = useToast();
  const createMutation = useCreateBeneficiary();
  const [form, setForm] = useState<BeneficiaryFormData>({
    full_name: initialName || "",
    mobile: initialMobile || "",
    national_id: "",
    gender: "",
    birth_date: "",
    city: "",
    district: "",
    address: "",
    notes: "",
  });
  const [errors, setErrors] = useState<{ mobile?: string; national_id?: string }>({});

  const update = (key: keyof BeneficiaryFormData, value: string) => {
    if (key === "mobile" || key === "national_id") {
      const numericValue = digitsOnly(value).slice(0, 10);
      setForm((prev) => ({ ...prev, [key]: numericValue }));
      setErrors((prev) => ({
        ...prev,
        [key]: key === "mobile"
          ? (!numericValue ? undefined : (isValidMobile(numericValue) ? undefined : MOBILE_ERROR))
          : (!numericValue ? undefined : (isValidNationalId(numericValue) ? undefined : NATIONAL_ID_ERROR)),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getValidationErrors = () => {
    const nextErrors: { mobile?: string; national_id?: string } = {};
    if (!form.mobile.trim() || !isValidMobile(form.mobile.trim())) {
      nextErrors.mobile = MOBILE_ERROR;
    }
    if (form.national_id?.trim() && !isValidNationalId(form.national_id.trim())) {
      nextErrors.national_id = NATIONAL_ID_ERROR;
    }
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast({ title: "خطأ", description: "اسم المستفيد مطلوب", variant: "destructive" });
      return;
    }
    const nextErrors = getValidationErrors();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({ title: "خطأ", description: "يرجى تصحيح بيانات الجوال/الهوية قبل الحفظ", variant: "destructive" });
      return;
    }

    try {
      const result = await createMutation.mutateAsync(form);
      toast({ title: "تم", description: "تم إضافة المستفيد بنجاح" });
      onCreated?.(result);
      onOpenChange(false);
      setForm({ full_name: "", mobile: "", national_id: "", gender: "", birth_date: "", city: "", district: "", address: "", notes: "" });
    } catch (err: any) {
      const msg = err?.message || "";
      const description = msg.includes("duplicate") || msg.includes("unique")
        ? "يوجد مستفيد بنفس رقم الجوال"
        : "تعذر حفظ المستفيد، يرجى المحاولة مرة أخرى";
      toast({ title: "خطأ", description, variant: "destructive" });
    }
  };

  const NONE = "__none__";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">إضافة مستفيد جديد</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>الاسم الكامل *</Label>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="الاسم الكامل للمستفيد" />
            </div>
            <div>
              <Label>رقم الجوال *</Label>
              <Input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" inputMode="numeric" maxLength={10} />
              {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
            </div>
            <div>
              <Label>رقم الهوية</Label>
              <Input value={form.national_id || ""} onChange={(e) => update("national_id", e.target.value)} placeholder="رقم الهوية الوطنية" dir="ltr" inputMode="numeric" maxLength={10} />
              {errors.national_id && <p className="text-xs text-destructive mt-1">{errors.national_id}</p>}
            </div>
            <div>
              <Label>الجنس</Label>
              <Select value={form.gender || NONE} onValueChange={(v) => update("gender", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— غير محدد —</SelectItem>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الميلاد</Label>
              <Input type="date" value={form.birth_date || ""} onChange={(e) => update("birth_date", e.target.value)} />
            </div>
            <div>
              <Label>المدينة</Label>
              <Input value={form.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="المدينة" />
            </div>
            <div>
              <Label>الحي</Label>
              <Input value={form.district || ""} onChange={(e) => update("district", e.target.value)} placeholder="الحي" />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.address || ""} onChange={(e) => update("address", e.target.value)} placeholder="العنوان التفصيلي" />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} placeholder="ملاحظات إضافية" rows={2} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ المستفيد
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
