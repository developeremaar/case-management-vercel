
CREATE TABLE public.workflow_step_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_step_id UUID NOT NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('role', 'department', 'user')),
  action_type TEXT NOT NULL CHECK (action_type IN ('execute', 'approve', 'return', 'edit', 'assign', 'close')),
  role_id UUID NULL,
  department_id UUID NULL,
  membership_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_step_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view step assignees"
ON public.workflow_step_assignees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert step assignees"
ON public.workflow_step_assignees FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update step assignees"
ON public.workflow_step_assignees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete step assignees"
ON public.workflow_step_assignees FOR DELETE TO authenticated USING (true);
