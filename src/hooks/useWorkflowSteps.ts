import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StepTransition } from "@/config/workflowSteps";

const WORKFLOW_TEMPLATE_ID = "96574008-df0d-429c-a6bf-6471611b68b6";

export interface WorkflowStepDB {
  id: string;
  code: string;
  name: string;
  step_order: number;
  workflow_template_id: string;
}

export function useWorkflowSteps() {
  return useQuery<WorkflowStepDB[]>({
    queryKey: ["workflow_steps", WORKFLOW_TEMPLATE_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_template_id", WORKFLOW_TEMPLATE_ID)
        .order("step_order", { ascending: true });

      if (error) {
        console.error("[WorkflowSteps] Error:", error);
        throw error;
      }
      console.log("[WorkflowSteps] Loaded:", data);
      return data as WorkflowStepDB[];
    },
  });
}

export function findStepByCode(steps: WorkflowStepDB[], code: string) {
  return steps.find((s) => s.code === code);
}

export function findStepById(steps: WorkflowStepDB[], id: string) {
  return steps.find((s) => s.id === id);
}

export function getFirstStep(steps: WorkflowStepDB[]) {
  return steps.reduce((min, s) => (s.step_order < min.step_order ? s : min), steps[0]);
}

/**
 * Resolve a transition type to a target step UUID.
 * Returns undefined if no valid target (e.g., already at first/last step).
 */
export function resolveTransition(
  steps: WorkflowStepDB[],
  currentStepId: string,
  transition: StepTransition
): string | undefined {
  if (!transition) return undefined; // stay on current step

  const currentStep = findStepById(steps, currentStepId);
  if (!currentStep) return undefined;

  if (transition === "__next__") {
    const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
    const nextStep = sorted.find((s) => s.step_order > currentStep.step_order);
    return nextStep?.id;
  }

  if (transition === "__prev__") {
    const sorted = [...steps].sort((a, b) => b.step_order - a.step_order);
    const prevStep = sorted.find((s) => s.step_order < currentStep.step_order);
    return prevStep?.id;
  }

  if (transition === "__rejected__") {
    const rejected = findStepByCode(steps, "rejected");
    return rejected?.id;
  }

  return undefined;
}
