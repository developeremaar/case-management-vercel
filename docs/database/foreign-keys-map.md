# Foreign Keys Map

## خريطة العلاقات

- organizations -> branches -> departments
- organizations -> memberships -> membership_permissions
- organizations -> roles -> role_permissions
- organizations -> beneficiaries -> beneficiary_contacts
- organizations -> case_types/case_statuses/case_priorities/case_sources
- organizations -> workflow_templates -> workflow_steps -> workflow_step_assignees
- organizations -> cases -> attachments/activity_logs/case_assignments/case_closures/case_custom_values/case_execution_actions/case_notes/case_publications/case_workflow_instances -> case_workflow_step_instances/case_approvals
- organizations -> notifications
- organizations -> user_invitations

## علاقات تؤثر على عزل الجهات

- كل ما يتبع `cases` حساس جدًا لعزل الجهة.
- كل ما يتبع `memberships` حساس لأنه يمثل صلاحيات الوصول.
- كل ما يتبع `workflow_templates` حساس لأنه يحدد مسارات التشغيل.

## جداول تتطلب حذر RLS خاص بدون organization_id مباشر

beneficiary_contacts, case_approvals, case_assignments, case_closures, case_custom_values, case_execution_actions, case_notes, case_publications, case_workflow_instances, case_workflow_step_instances, membership_permissions, role_permissions, workflow_step_assignees, workflow_steps.
