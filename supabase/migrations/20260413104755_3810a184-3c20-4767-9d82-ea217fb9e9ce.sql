
CREATE TABLE public.workflow_step_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

ALTER TABLE public.workflow_step_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view step definitions"
  ON public.workflow_step_definitions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert step definitions"
  ON public.workflow_step_definitions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update step definitions"
  ON public.workflow_step_definitions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete step definitions"
  ON public.workflow_step_definitions FOR DELETE
  TO authenticated USING (true);
