import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { StepTransition } from "@/config/workflowSteps";

export interface WorkflowStepDB {
  id: string;
  code: string;
  name: string;
  step_order: number;
  workflow_template_id: string;
}

type WorkflowTemplateRow = {
  id: string;
  organization_id: string;
  is_active: boolean;
  case_type_id: string | null;
  is_default?: boolean;
};

export function getFirstStep(steps: WorkflowStepDB[] | null | undefined): WorkflowStepDB | null {
  if (!steps?.length) return null;
  return [...steps].sort((a, b) => a.step_order - b.step_order)[0] ?? null;
}

export function findStepById(steps: WorkflowStepDB[] | null | undefined, stepId: string | null | undefined): WorkflowStepDB | null {
  if (!steps || !stepId) return null;
  return steps.find((step) => step.id === stepId) ?? null;
}

export function resolveTransition(
  steps: WorkflowStepDB[] | null | undefined,
  currentStep: WorkflowStepDB | null | undefined,
  transitionCode: StepTransition | null | undefined
): WorkflowStepDB | null {
  if (!steps || !currentStep || !transitionCode) return null;

  if (transitionCode === "__next__") {
    return steps.find((s) => s.step_order === currentStep.step_order + 1) ?? null;
  }
  if (transitionCode === "__prev__") {
    return steps.find((s) => s.step_order === currentStep.step_order - 1) ?? null;
  }
  if (transitionCode === "__rejected__") {
    return steps.find((s) => s.code === "rejected") ?? null;
  }
  return null;
}

function isTemplateDefault(template: WorkflowTemplateRow): boolean {
  return template.is_default === true;
}

export function useWorkflowSteps(caseTypeId?: string | null) {
  const { currentMembership } = useOrganization();
  const organizationId = currentMembership?.organization_id;

  return useQuery<WorkflowStepDB[]>({
    queryKey: ["workflow_steps", organizationId, caseTypeId ?? null],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data: templates, error: templatesError } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true);

      if (templatesError) throw templatesError;
      const templateRows = (templates ?? []) as WorkflowTemplateRow[];

      let selectedTemplate = caseTypeId
        ? templateRows.find((template) => template.case_type_id === caseTypeId)
        : undefined;
      if (!selectedTemplate) selectedTemplate = templateRows.find((template) => template.case_type_id == null && isTemplateDefault(template));
      if (!selectedTemplate) selectedTemplate = templateRows.find((template) => template.case_type_id == null);
      if (!selectedTemplate) return [];

      const { data, error } = await supabase
        .from("workflow_steps")
        .select("id, code, name, step_order, workflow_template_id")
        .eq("workflow_template_id", selectedTemplate.id)
        .order("step_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as WorkflowStepDB[];
    },
  });
}
