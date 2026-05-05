/**
 * Workflow Steps Configuration (MVP)
 * 
 * Steps are loaded from DB (workflow_steps table).
 * This file defines allowed actions per step CODE,
 * and how each action transitions using step_order logic.
 * 
 * Transition types:
 *   "__next__"     → step_order + 1
 *   "__prev__"     → step_order - 1
 *   "__rejected__" → step with code "rejected"
 *   null           → stay on current step
 */

export type StepTransition = "__next__" | "__prev__" | "__rejected__" | null;

export interface WorkflowActionRule {
  type: string;
  label: string;
  /** How to resolve the target step */
  transition: StepTransition;
  /** Permission code required to perform this action */
  permissionCode: string;
}

/** Actions allowed per step code */
export const STEP_ACTION_RULES: Record<string, WorkflowActionRule[]> = {
  intake: [
    { type: "transfer", label: "تحويل إلى قسم", transition: null, permissionCode: "transfer_case" },
    { type: "approve", label: "تمرير للدراسة", transition: "__next__", permissionCode: "approve_case" },
    { type: "reject", label: "رفض", transition: "__rejected__", permissionCode: "reject_case" },
  ],
  study: [
    { type: "transfer", label: "تحويل إلى قسم", transition: null, permissionCode: "transfer_case" },
    { type: "approve", label: "تمرير للاعتماد", transition: "__next__", permissionCode: "approve_case" },
    { type: "return", label: "إرجاع", transition: "__prev__", permissionCode: "return_case" },
    { type: "reject", label: "رفض", transition: "__rejected__", permissionCode: "reject_case" },
  ],
  approval: [
    { type: "approve", label: "اعتماد", transition: "__next__", permissionCode: "approve_case" },
    { type: "return", label: "إرجاع", transition: "__prev__", permissionCode: "return_case" },
    { type: "reject", label: "رفض", transition: "__rejected__", permissionCode: "reject_case" },
  ],
  execution: [
    { type: "approve", label: "إغلاق", transition: "__next__", permissionCode: "close_case" },
    { type: "return", label: "إرجاع للاعتماد", transition: "__prev__", permissionCode: "return_case" },
  ],
  closure: [
    { type: "reopen", label: "إعادة فتح", transition: "__prev__", permissionCode: "reopen_case" },
  ],
  rejected: [
    { type: "reopen", label: "إعادة فتح", transition: "__prev__", permissionCode: "reopen_case" },
  ],
};

export function getAllowedActionsByCode(stepCode: string): WorkflowActionRule[] {
  return STEP_ACTION_RULES[stepCode] ?? [];
}
