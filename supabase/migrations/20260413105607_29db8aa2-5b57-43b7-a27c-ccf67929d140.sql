
-- Remove organization_id from workflow_step_definitions (make it global)
ALTER TABLE public.workflow_step_definitions DROP COLUMN organization_id;

-- Drop and recreate the unique constraint without organization_id
ALTER TABLE public.workflow_step_definitions DROP CONSTRAINT IF EXISTS workflow_step_definitions_organization_id_code_key;
ALTER TABLE public.workflow_step_definitions ADD CONSTRAINT workflow_step_definitions_code_key UNIQUE (code);
