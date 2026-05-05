# RLS Policies Review

## الجداول التي RLS غير مفعّل عليها

- beneficiary_contacts
- membership_permissions
- workflow_step_definitions

## ملاحظات المخاطر

- وجود جداول بدون RLS يمثل فجوة عزل مباشرة في نموذج SaaS متعدد الجهات.
- بعض السياسات تعتمد على شروط مرنة مثل `organization_id IS NULL`؛ يجب ضبط نطاقها على بيانات المنصة فقط.
- الجداول غير المباشرة (بدون organization_id مباشر) تعتمد على دقة علاقات EXISTS مع الجداول الأب.

## الجداول التي تعتمد على دوال العضوية/الإدارة

تعتمد السياسات بشكل واسع على:
- `user_has_org_membership(organization_id)`
- `user_is_org_admin(organization_id)`

ويظهر ذلك في جداول مثل cases, memberships, roles, departments, workflow_templates, workflow_steps, workflow_step_assignees, notifications, activity_logs, user_invitations.

## توصيات (بدون تنفيذ)

1. سد فجوات الجداول الثلاثة غير المحمية بـRLS.
2. مراجعة كل policy تتضمن `organization_id IS NULL`.
3. بناء اختبارات عزل آلية (cross-tenant access tests).
4. توثيق مصفوفة صلاحيات (Table × Action × Role).
