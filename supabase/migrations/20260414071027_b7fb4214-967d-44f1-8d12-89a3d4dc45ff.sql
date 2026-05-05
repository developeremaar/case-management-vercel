
-- Create case_types table
CREATE TABLE IF NOT EXISTS public.case_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  organization_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view case_types" ON public.case_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert case_types" ON public.case_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update case_types" ON public.case_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete case_types" ON public.case_types FOR DELETE TO authenticated USING (true);

-- Create workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  case_type_id UUID REFERENCES public.case_types(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow_templates" ON public.workflow_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert workflow_templates" ON public.workflow_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update workflow_templates" ON public.workflow_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete workflow_templates" ON public.workflow_templates FOR DELETE TO authenticated USING (true);

-- Create workflow_steps table
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 1,
  step_type TEXT NOT NULL DEFAULT 'review' CHECK (step_type IN ('review', 'approval', 'assignment', 'execution', 'publish', 'close')),
  department_id UUID,
  is_required BOOLEAN NOT NULL DEFAULT false,
  allow_parallel_approvals BOOLEAN NOT NULL DEFAULT false,
  allow_return_for_info BOOLEAN NOT NULL DEFAULT false,
  auto_move_on_success BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow_steps" ON public.workflow_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert workflow_steps" ON public.workflow_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update workflow_steps" ON public.workflow_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete workflow_steps" ON public.workflow_steps FOR DELETE TO authenticated USING (true);
