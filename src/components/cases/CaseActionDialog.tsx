import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useCaseLookups } from "@/hooks/useCases";
import { useCreateCaseAction } from "@/hooks/useActivityLogs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useWorkflowSteps, findStepById, resolveTransition } from "@/hooks/useWorkflowSteps";
import { getAllowedActionsByCode, type WorkflowActionRule } from "@/config/workflowSteps";
import { useHasPermission } from "@/hooks/usePermissions";

interface CaseActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  currentStepId: string;
}

export function CaseActionDialog({ open, onOpenChange, caseId, currentStepId }: CaseActionDialogProps) {
  const [selectedAction, setSelectedAction] = useState<WorkflowActionRule | null>(null);
  const [notes, setNotes] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [newStatusId, setNewStatusId] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const { departments, statuses } = useCaseLookups();
  const { data: workflowSteps } = useWorkflowSteps();
  const createAction = useCreateCaseAction();
  const { toast } = useToast();
  const { hasPermission } = useHasPermission();

  const currentStep = workflowSteps ? findStepById(workflowSteps, currentStepId) : null;
  const currentStepCode = currentStep?.code || "";
  const allActions = getAllowedActionsByCode(currentStepCode);
  const allowedActions = allActions.filter((a) => hasPermission(a.permissionCode));

  const needsDepartment = selectedAction?.type === "transfer";
  const needsStatus = selectedAction?.type === "reject";
  
  // Check if this action leads to closure
  const isClosureAction = (() => {
    if (!selectedAction?.transition || !workflowSteps) return false;
    const targetId = resolveTransition(workflowSteps, currentStepId, selectedAction.transition);
    if (!targetId) return false;
    const targetStep = findStepById(workflowSteps, targetId);
    return targetStep?.code === "closure";
  })();

  const resetForm = () => {
    setSelectedAction(null);
    setNotes("");
    setNewDepartmentId("");
    setNewStatusId("");
    setFinalAmount("");
  };

  const handleSubmit = async () => {
    if (!selectedAction) {
      toast({ title: "خطأ", description: "اختر نوع الإجراء", variant: "destructive" });
      return;
    }
    if (needsDepartment && !newDepartmentId) {
      toast({ title: "خطأ", description: "اختر القسم", variant: "destructive" });
      return;
    }
    if (needsStatus && !newStatusId) {
      toast({ title: "خطأ", description: "اختر الحالة النظامية الجديدة", variant: "destructive" });
      return;
    }

    // Resolve target step using step_order logic
    let targetStepUUID: string | undefined;
    if (selectedAction.transition && workflowSteps) {
      targetStepUUID = resolveTransition(workflowSteps, currentStepId, selectedAction.transition);
      if (!targetStepUUID) {
        toast({ title: "خطأ", description: "لا يمكن الانتقال إلى المرحلة المطلوبة", variant: "destructive" });
        return;
      }
    }

    try {
      // Check if target step is the closure step → auto-complete
      let autoCompleteStatusId: string | undefined;
      if (targetStepUUID && workflowSteps) {
        const targetStep = findStepById(workflowSteps, targetStepUUID);
        if (targetStep?.code === "closure") {
          // Find "مكتملة" status
          const completedStatus = statuses.data?.find(
            (s) => s.code === "completed" || s.name === "مكتملة"
          );
          autoCompleteStatusId = completedStatus?.id;
        }
      }

      await createAction.mutateAsync({
        case_id: caseId,
        action_type: selectedAction.type,
        notes: notes || undefined,
        new_department_id: needsDepartment ? newDepartmentId : undefined,
        new_status_id: needsStatus ? newStatusId : undefined,
        new_step_id: targetStepUUID,
        auto_complete_status_id: autoCompleteStatusId,
        final_amount: isClosureAction && finalAmount ? parseFloat(finalAmount) : null,
      });
      toast({ title: "تم", description: "تم تنفيذ الإجراء بنجاح" });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[CaseAction] Error:", err);
      toast({ title: "خطأ", description: err.message || "حدث خطأ أثناء تنفيذ الإجراء", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إجراء جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {allowedActions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد إجراءات متاحة في هذه المرحلة
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>نوع الإجراء *</Label>
                <Select
                  value={selectedAction ? `${allowedActions.indexOf(selectedAction)}` : ""}
                  onValueChange={(val) => {
                    const idx = parseInt(val, 10);
                    setSelectedAction(allowedActions[idx] || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الإجراء" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedActions.map((a, idx) => (
                      <SelectItem key={idx} value={`${idx}`}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsDepartment && (
                <div className="space-y-2">
                  <Label>القسم الجديد *</Label>
                  <Select value={newDepartmentId} onValueChange={setNewDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.data?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsStatus && (
                <div className="space-y-2">
                  <Label>الحالة النظامية الجديدة *</Label>
                  <Select value={newStatusId} onValueChange={setNewStatusId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.data?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isClosureAction && (
                <div className="space-y-2">
                  <Label>المبلغ النهائي المصروف</Label>
                  <Input
                    type="number"
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                    placeholder="اختياري — اتركه فارغًا إذا لم يُصرف"
                    dir="ltr"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">سيتم حفظه في سجل الإغلاق</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول الإجراء..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            إلغاء
          </Button>
          {allowedActions.length > 0 && (
            <Button onClick={handleSubmit} disabled={createAction.isPending} className="gap-1.5">
              {createAction.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              تنفيذ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
