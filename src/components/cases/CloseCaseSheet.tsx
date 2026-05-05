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
import { useCloseCase } from "@/hooks/useCaseClosures";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function CloseCaseSheet({ open, onOpenChange, caseId }: Props) {
  const { toast } = useToast();
  const closeMutation = useCloseCase();
  const [form, setForm] = useState({
    closure_reason: "",
    notes: "",
    final_amount: "",
    reference_number: "",
    disbursement_date: "",
    executing_entity: "",
  });

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      closure_reason: "",
      notes: "",
      final_amount: "",
      reference_number: "",
      disbursement_date: "",
      executing_entity: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.closure_reason.trim()) {
      toast({ title: "خطأ", description: "سبب الإغلاق مطلوب", variant: "destructive" });
      return;
    }

    try {
      await closeMutation.mutateAsync({
        case_id: caseId,
        closure_reason: form.closure_reason.trim(),
        notes: form.notes.trim() || undefined,
        final_amount: form.final_amount ? parseFloat(form.final_amount) : null,
        reference_number: form.reference_number.trim() || undefined,
        disbursement_date: form.disbursement_date || undefined,
        executing_entity: form.executing_entity.trim() || undefined,
      });
      toast({ title: "تم", description: "تم إغلاق الحالة بنجاح" });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[CloseCaseSheet] Error:", err);
      toast({ title: "خطأ", description: err.message || "فشل إغلاق الحالة", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">إغلاق الحالة</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>سبب الإغلاق *</Label>
              <Textarea
                value={form.closure_reason}
                onChange={(e) => update("closure_reason", e.target.value)}
                placeholder="أدخل سبب إغلاق الحالة..."
                rows={2}
              />
            </div>
            <div>
              <Label>ملاحظات الإغلاق</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
            <div>
              <Label>مبلغ الدعم المصروف</Label>
              <Input
                type="number"
                value={form.final_amount}
                onChange={(e) => update("final_amount", e.target.value)}
                placeholder="اختياري — اتركه فارغًا إذا لم يُصرف"
                dir="ltr"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">اختياري — سيتم حفظه في سجل الإغلاق</p>
            </div>
            <div>
              <Label>رقم السند / المرجع المالي</Label>
              <Input
                value={form.reference_number}
                onChange={(e) => update("reference_number", e.target.value)}
                placeholder="رقم السند أو المرجع"
                dir="ltr"
              />
            </div>
            <div>
              <Label>تاريخ الصرف</Label>
              <Input
                type="date"
                value={form.disbursement_date}
                onChange={(e) => update("disbursement_date", e.target.value)}
              />
            </div>
            <div>
              <Label>الجهة المنفذة / وسيلة الصرف</Label>
              <Input
                value={form.executing_entity}
                onChange={(e) => update("executing_entity", e.target.value)}
                placeholder="مثال: تحويل بنكي، شيك..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              إلغاء
            </Button>
            <Button type="submit" disabled={closeMutation.isPending} variant="destructive">
              {closeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد الإغلاق
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
