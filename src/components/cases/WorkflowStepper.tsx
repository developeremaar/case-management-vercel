import { useWorkflowSteps, findStepById } from "@/hooks/useWorkflowSteps";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStepperProps {
  currentStepId: string; // UUID from cases.current_step_id
}

export function WorkflowStepper({ currentStepId }: WorkflowStepperProps) {
  const { data: steps, isLoading } = useWorkflowSteps();

  if (isLoading || !steps || steps.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-2">جاري تحميل مراحل العمل...</div>;
  }

  const current = findStepById(steps, currentStepId);
  const isRejected = current?.code === "rejected";

  // Linear steps (exclude rejected for stepper display)
  const linearSteps = steps.filter((s) => s.code !== "rejected");

  return (
    <div className="w-full">
      {isRejected ? (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <span className="text-sm font-semibold text-destructive">المرحلة الحالية: مرفوضة</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {linearSteps.map((step, idx) => {
            const isCurrent = step.id === currentStepId;
            const isPast = current ? step.step_order < current.step_order : false;
            const isLast = idx === linearSteps.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full border-2 text-xs font-bold transition-colors shrink-0",
                      isPast && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      !isPast && !isCurrent && "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {isPast ? <Check className="h-4 w-4" /> : step.step_order}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] text-center leading-tight truncate max-w-[72px]",
                      isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                </div>

                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-1 mt-[-18px]",
                      isPast ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
