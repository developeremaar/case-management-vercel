import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { StepTransition } from "@/config/workflowSteps";

export interface WorkflowStepDB {
  id: string;
  code: string;
  name_ar: string;
  step_order: number;
  allowed_transitions: StepTransition[];
  workflow_template_id: string;
}

type WorkflowTemplateRow = {
  id: string;
  organization_id: string;
  is_active: boolean;
  case_type_id: string | null;
  [key: string]: unknown;
};

export function getFirstStep(
  steps: WorkflowStepDB[] | null | undefined
): WorkflowStepDB | null {
  if (!steps || steps.length === 0) {
    return null;
  }

  return [...steps].sort((a, b) => a.step_order - b.step_order)[0] ?? null;
}

export function findStepById(
  steps: WorkflowStepDB[] | null | undefined,
  stepId: string | null | undefined
): WorkflowStepDB | null {
  if (!steps || !stepId) {
    return null;
  }

  return steps.find((step) => step.id === stepId) ?? null;
}

export function resolveTransition(
  currentStep: WorkflowStepDB | null | undefined,
  transitionCode: string | null | undefined
): StepTransition | null {
  if (!currentStep || !transitionCode) {
    return null;
  }

  return (
    currentStep.allowed_transitions?.find(
      (transition) => transition.code === transitionCode
    ) ?? null
  );
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

      if (templatesError) {
        console.error(
          "[WorkflowSteps] Template resolution error:",
          templatesError
        );
        throw templatesError;
      }

      const templateRows = (templates ?? []) as WorkflowTemplateRow[];

      let selectedTemplate: WorkflowTemplateRow | undefined;

      if (caseTypeId) {
        selectedTemplate = templateRows.find(
          (template) => template.case_type_id === caseTypeId
        );
      }

      if (!selectedTemplate) {
        selectedTemplate = templateRows.find(
          (template) =>
            template.case_type_id == null && isTemplateDefault(template)
        );
      }

      if (!selectedTemplate) {
        selectedTemplate = templateRows.find(
          (template) => template.case_type_id == null
        );
      }

      if (!selectedTemplate) {
        return [];
      }

      const { data, error } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_template_id", selectedTemplate.id)
        .order("step_order", { ascending: true });

      if (error) {
        console.error("[WorkflowSteps] Error:", error);
        throw error;
      }

      return (data ?? []) as WorkflowStepDB[];
    },
  });
}