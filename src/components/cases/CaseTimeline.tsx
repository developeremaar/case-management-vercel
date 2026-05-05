import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Loader2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkflowSteps, findStepById } from "@/hooks/useWorkflowSteps";

const ACTION_LABELS: Record<string, string> = {
  transfer: "تحويل إلى قسم",
  return: "إرجاع",
  approve: "اعتماد",
  reject: "رفض",
  update: "تحديث بيانات",
  created: "إنشاء الحالة",
};

const ACTION_COLORS: Record<string, string> = {
  transfer: "bg-blue-500",
  return: "bg-amber-500",
  approve: "bg-green-500",
  reject: "bg-destructive",
  update: "bg-primary",
  created: "bg-primary",
};

interface CaseTimelineProps {
  caseId: string;
  createdAt: string;
  createdByName?: string;
}

export function CaseTimeline({ caseId, createdAt, createdByName }: CaseTimelineProps) {
  const { data: logs, isLoading } = useActivityLogs(caseId);
  const { data: workflowSteps } = useWorkflowSteps();

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const resolveStepName = (stepId: string) => {
    if (!workflowSteps) return stepId;
    const step = findStepById(workflowSteps, stepId);
    return step?.name || step?.code || stepId;
  };

  const allEvents = [
    {
      id: "creation",
      action: "created",
      created_at: createdAt,
      actor_user: createdByName ? { full_name: createdByName } : null,
      details: null as Record<string, any> | null,
    },
    ...(logs || []),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          سجل الإجراءات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="relative border-r-2 border-border pr-6 space-y-6">
            {allEvents.map((event, idx) => (
              <div key={event.id || idx} className="relative">
                <div
                  className={`absolute -right-[1.9rem] top-1 h-3 w-3 rounded-full border-2 border-background ${
                    ACTION_COLORS[event.action] || "bg-muted-foreground"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {ACTION_LABELS[event.action] || event.action}
                    </p>
                    {event.action !== "created" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {ACTION_LABELS[event.action] || event.action}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(event.created_at)}
                  </p>
                  {event.actor_user && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.actor_user.full_name}
                    </p>
                  )}
                  {(event as any).meta_json?.notes && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">
                      {(event as any).meta_json.notes}
                    </p>
                  )}
                  {(event as any).new_values_json?.current_step_id && (
                    <p className="text-xs text-primary mt-1">
                      ← انتقلت إلى: {resolveStepName((event as any).new_values_json.current_step_id)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
