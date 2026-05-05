# Current Schema Snapshot (Source of Truth: docs/input)

> هذا المستند مبني فقط على الملفات داخل `docs/input` بتاريخ التحليل الحالي.

## 1) الجداول الحالية

عدد الجداول العامة الحالية: **35 جدولًا**:

- activity_logs
- attachments
- beneficiaries
- beneficiary_contacts
- branches
- case_approvals
- case_assignments
- case_closures
- case_custom_fields
- case_custom_values
- case_execution_actions
- case_notes
- case_priorities
- case_publications
- case_sources
- case_statuses
- case_types
- case_workflow_instances
- case_workflow_step_instances
- cases
- departments
- membership_permissions
- memberships
- notifications
- organization_settings
- organizations
- permissions
- role_permissions
- roles
- user_invitations
- users
- workflow_step_assignees
- workflow_step_definitions
- workflow_steps
- workflow_templates

## 2) أهم الحقول لكل جدول (ملخص عملي)

- **الهوية والجهات**: organizations, organization_settings, branches, departments.
- **المستخدمون والصلاحيات**: users, memberships, roles, permissions, role_permissions, membership_permissions, user_invitations.
- **إدارة الحالات**: cases مع جداول داعمة (case_types, case_statuses, case_priorities, case_sources).
- **سير العمل**: workflow_templates, workflow_steps, workflow_step_assignees, case_workflow_instances, case_workflow_step_instances, workflow_step_definitions.
- **تشغيل الحالة**: case_assignments, case_notes, case_execution_actions, case_approvals, case_closures, case_publications.
- **البيانات المرتبطة**: beneficiaries, beneficiary_contacts, attachments.
- **الرصد والتنبيهات**: activity_logs, notifications.

## 3) العلاقات الرئيسية

- التنظيمي: organization -> branches -> departments.
- العضوية: users -> memberships -> roles (+ permissions عبر role_permissions/membership_permissions).
- الحالة: organizations -> cases -> (notes/assignments/actions/approvals/closures/publications/attachments/custom_values).
- المستفيد: organizations -> beneficiaries -> beneficiary_contacts, ويرتبط بـ cases/attachments.
- سير العمل: workflow_templates -> workflow_steps -> workflow_step_assignees، ثم ربط تشغيلي عبر case_workflow_instances و case_workflow_step_instances.

## 4) الجداول الحساسة (تحتاج تشديد عزل)

- `cases` وملحقاتها التشغيلية.
- `beneficiaries` و`beneficiary_contacts`.
- `memberships` و`roles` و`membership_permissions` و`role_permissions`.
- `activity_logs`.
- `notifications`.

## 5) الجداول التي تحتوي `organization_id` مباشرة

activity_logs, attachments, beneficiaries, branches, case_custom_fields, case_priorities, case_sources, case_statuses, case_types, cases, departments, memberships, notifications, organization_settings, roles, user_invitations, workflow_templates.

## 6) الجداول التي تعتمد على `organization_id` بشكل غير مباشر

- عبر `cases`: case_approvals, case_assignments, case_closures, case_custom_values, case_execution_actions, case_notes, case_publications, case_workflow_instances.
- عبر `beneficiaries`: beneficiary_contacts.
- عبر `memberships`: membership_permissions.
- عبر `roles`: role_permissions.
- عبر `workflow_templates`/`workflow_steps`: workflow_steps, workflow_step_assignees, case_workflow_step_instances.
- جداول مرجعية/منصة عامة: organizations, users, permissions, workflow_step_definitions.
