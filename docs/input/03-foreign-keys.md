| source_table                 | source_column               | target_table                 | target_column | constraint_name                                             | update_rule | delete_rule |
| ---------------------------- | --------------------------- | ---------------------------- | ------------- | ----------------------------------------------------------- | ----------- | ----------- |
| activity_logs                | actor_membership_id         | memberships                  | id            | activity_logs_actor_membership_id_fkey                      | NO ACTION   | SET NULL    |
| activity_logs                | actor_user_id               | users                        | id            | activity_logs_actor_user_id_fkey                            | NO ACTION   | SET NULL    |
| activity_logs                | case_id                     | cases                        | id            | activity_logs_case_id_fkey                                  | NO ACTION   | CASCADE     |
| activity_logs                | organization_id             | organizations                | id            | activity_logs_organization_id_fkey                          | NO ACTION   | CASCADE     |
| attachments                  | beneficiary_id              | beneficiaries                | id            | attachments_beneficiary_id_fkey                             | NO ACTION   | CASCADE     |
| attachments                  | case_id                     | cases                        | id            | attachments_case_id_fkey                                    | NO ACTION   | CASCADE     |
| attachments                  | organization_id             | organizations                | id            | attachments_organization_id_fkey                            | NO ACTION   | CASCADE     |
| attachments                  | uploaded_by_membership_id   | memberships                  | id            | attachments_uploaded_by_membership_id_fkey                  | NO ACTION   | SET NULL    |
| beneficiaries                | organization_id             | organizations                | id            | beneficiaries_organization_id_fkey                          | NO ACTION   | CASCADE     |
| beneficiary_contacts         | beneficiary_id              | beneficiaries                | id            | beneficiary_contacts_beneficiary_id_fkey                    | NO ACTION   | CASCADE     |
| branches                     | organization_id             | organizations                | id            | branches_organization_id_fkey                               | NO ACTION   | CASCADE     |
| case_approvals               | approver_membership_id      | memberships                  | id            | case_approvals_approver_membership_id_fkey                  | NO ACTION   | RESTRICT    |
| case_approvals               | case_id                     | cases                        | id            | case_approvals_case_id_fkey                                 | NO ACTION   | CASCADE     |
| case_approvals               | workflow_step_instance_id   | case_workflow_step_instances | id            | case_approvals_workflow_step_instance_id_fkey               | NO ACTION   | CASCADE     |
| case_assignments             | case_id                     | cases                        | id            | case_assignments_case_id_fkey                               | NO ACTION   | CASCADE     |
| case_assignments             | from_department_id          | departments                  | id            | case_assignments_from_department_id_fkey                    | NO ACTION   | SET NULL    |
| case_assignments             | from_membership_id          | memberships                  | id            | case_assignments_from_membership_id_fkey                    | NO ACTION   | SET NULL    |
| case_assignments             | to_department_id            | departments                  | id            | case_assignments_to_department_id_fkey                      | NO ACTION   | SET NULL    |
| case_assignments             | to_membership_id            | memberships                  | id            | case_assignments_to_membership_id_fkey                      | NO ACTION   | SET NULL    |
| case_closures                | case_id                     | cases                        | id            | case_closures_case_id_fkey                                  | NO ACTION   | CASCADE     |
| case_closures                | closed_by_membership_id     | memberships                  | id            | case_closures_closed_by_membership_id_fkey                  | NO ACTION   | SET NULL    |
| case_custom_fields           | applies_to_case_type_id     | case_types                   | id            | case_custom_fields_applies_to_case_type_id_fkey             | NO ACTION   | CASCADE     |
| case_custom_fields           | organization_id             | organizations                | id            | case_custom_fields_organization_id_fkey                     | NO ACTION   | CASCADE     |
| case_custom_values           | case_id                     | cases                        | id            | case_custom_values_case_id_fkey                             | NO ACTION   | CASCADE     |
| case_custom_values           | field_id                    | case_custom_fields           | id            | case_custom_values_field_id_fkey                            | NO ACTION   | CASCADE     |
| case_execution_actions       | case_id                     | cases                        | id            | case_execution_actions_case_id_fkey                         | NO ACTION   | CASCADE     |
| case_execution_actions       | department_id               | departments                  | id            | case_execution_actions_department_id_fkey                   | NO ACTION   | SET NULL    |
| case_execution_actions       | performed_by_membership_id  | memberships                  | id            | case_execution_actions_performed_by_membership_id_fkey      | NO ACTION   | SET NULL    |
| case_notes                   | case_id                     | cases                        | id            | case_notes_case_id_fkey                                     | NO ACTION   | CASCADE     |
| case_notes                   | membership_id               | memberships                  | id            | case_notes_membership_id_fkey                               | NO ACTION   | SET NULL    |
| case_priorities              | organization_id             | organizations                | id            | case_priorities_organization_id_fkey                        | NO ACTION   | CASCADE     |
| case_publications            | case_id                     | cases                        | id            | case_publications_case_id_fkey                              | NO ACTION   | CASCADE     |
| case_publications            | published_by_membership_id  | memberships                  | id            | case_publications_published_by_membership_id_fkey           | NO ACTION   | SET NULL    |
| case_sources                 | organization_id             | organizations                | id            | case_sources_organization_id_fkey                           | NO ACTION   | CASCADE     |
| case_statuses                | organization_id             | organizations                | id            | case_statuses_organization_id_fkey                          | NO ACTION   | CASCADE     |
| case_types                   | organization_id             | organizations                | id            | case_types_organization_id_fkey                             | NO ACTION   | CASCADE     |
| case_workflow_instances      | case_id                     | cases                        | id            | case_workflow_instances_case_id_fkey                        | NO ACTION   | CASCADE     |
| case_workflow_instances      | current_step_id             | workflow_steps               | id            | case_workflow_instances_current_step_id_fkey                | NO ACTION   | SET NULL    |
| case_workflow_instances      | workflow_template_id        | workflow_templates           | id            | case_workflow_instances_workflow_template_id_fkey           | NO ACTION   | RESTRICT    |
| case_workflow_step_instances | assigned_to_membership_id   | memberships                  | id            | case_workflow_step_instances_assigned_to_membership_id_fkey | NO ACTION   | SET NULL    |
| case_workflow_step_instances | workflow_instance_id        | case_workflow_instances      | id            | case_workflow_step_instances_workflow_instance_id_fkey      | NO ACTION   | CASCADE     |
| case_workflow_step_instances | workflow_step_id            | workflow_steps               | id            | case_workflow_step_instances_workflow_step_id_fkey          | NO ACTION   | RESTRICT    |
| cases                        | beneficiary_id              | beneficiaries                | id            | cases_beneficiary_id_fkey                                   | NO ACTION   | SET NULL    |
| cases                        | beneficiary_id              | beneficiaries                | id            | fk_cases_beneficiary                                        | NO ACTION   | SET NULL    |
| cases                        | branch_id                   | branches                     | id            | cases_branch_id_fkey                                        | NO ACTION   | SET NULL    |
| cases                        | case_source_id              | case_sources                 | id            | cases_case_source_id_fkey                                   | NO ACTION   | SET NULL    |
| cases                        | case_type_id                | case_types                   | id            | cases_case_type_id_fkey                                     | NO ACTION   | RESTRICT    |
| cases                        | created_by_membership_id    | memberships                  | id            | cases_created_by_membership_id_fkey                         | NO ACTION   | RESTRICT    |
| cases                        | current_department_id       | departments                  | id            | cases_current_department_id_fkey                            | NO ACTION   | SET NULL    |
| cases                        | current_owner_membership_id | memberships                  | id            | cases_current_owner_membership_id_fkey                      | NO ACTION   | SET NULL    |
| cases                        | current_step_id             | workflow_steps               | id            | fk_current_step                                             | NO ACTION   | SET NULL    |
| cases                        | department_id               | departments                  | id            | cases_department_id_fkey                                    | NO ACTION   | SET NULL    |
| cases                        | organization_id             | organizations                | id            | cases_organization_id_fkey                                  | NO ACTION   | CASCADE     |
| cases                        | priority_id                 | case_priorities              | id            | cases_priority_id_fkey                                      | NO ACTION   | SET NULL    |
| cases                        | status_id                   | case_statuses                | id            | cases_status_id_fkey                                        | NO ACTION   | RESTRICT    |
| cases                        | workflow_template_id        | workflow_templates           | id            | fk_cases_workflow_template                                  | NO ACTION   | SET NULL    |
| departments                  | branch_id                   | branches                     | id            | departments_branch_id_fkey                                  | NO ACTION   | SET NULL    |
| departments                  | organization_id             | organizations                | id            | departments_organization_id_fkey                            | NO ACTION   | CASCADE     |
| membership_permissions       | membership_id               | memberships                  | id            | membership_permissions_membership_id_fkey                   | NO ACTION   | CASCADE     |
| membership_permissions       | permission_id               | permissions                  | id            | membership_permissions_permission_id_fkey                   | NO ACTION   | CASCADE     |
| memberships                  | branch_id                   | branches                     | id            | memberships_branch_id_fkey                                  | NO ACTION   | SET NULL    |
| memberships                  | department_id               | departments                  | id            | memberships_department_id_fkey                              | NO ACTION   | SET NULL    |
| memberships                  | organization_id             | organizations                | id            | memberships_organization_id_fkey                            | NO ACTION   | CASCADE     |
| memberships                  | role_id                     | roles                        | id            | memberships_role_id_fkey                                    | NO ACTION   | RESTRICT    |
| memberships                  | user_id                     | users                        | id            | memberships_user_id_fkey                                    | NO ACTION   | CASCADE     |
| notifications                | membership_id               | memberships                  | id            | notifications_membership_id_fkey                            | NO ACTION   | SET NULL    |
| notifications                | organization_id             | organizations                | id            | notifications_organization_id_fkey                          | NO ACTION   | CASCADE     |
| notifications                | user_id                     | users                        | id            | notifications_user_id_fkey                                  | NO ACTION   | CASCADE     |
| organization_settings        | organization_id             | organizations                | id            | organization_settings_organization_id_fkey                  | NO ACTION   | CASCADE     |
| role_permissions             | permission_id               | permissions                  | id            | role_permissions_permission_id_fkey                         | NO ACTION   | CASCADE     |
| role_permissions             | role_id                     | roles                        | id            | role_permissions_role_id_fkey                               | NO ACTION   | CASCADE     |
| roles                        | organization_id             | organizations                | id            | roles_organization_id_fkey                                  | NO ACTION   | CASCADE     |
| user_invitations             | accepted_by_user_id         | users                        | id            | user_invitations_accepted_by_user_id_fkey                   | NO ACTION   | SET NULL    |
| user_invitations             | branch_id                   | branches                     | id            | user_invitations_branch_id_fkey                             | NO ACTION   | SET NULL    |
| user_invitations             | department_id               | departments                  | id            | user_invitations_department_id_fkey                         | NO ACTION   | SET NULL    |
| user_invitations             | invited_by_membership_id    | memberships                  | id            | user_invitations_invited_by_membership_id_fkey              | NO ACTION   | SET NULL    |
| user_invitations             | organization_id             | organizations                | id            | user_invitations_organization_id_fkey                       | NO ACTION   | CASCADE     |
| user_invitations             | role_id                     | roles                        | id            | user_invitations_role_id_fkey                               | NO ACTION   | RESTRICT    |
| workflow_step_assignees      | department_id               | departments                  | id            | workflow_step_assignees_department_id_fkey                  | NO ACTION   | CASCADE     |
| workflow_step_assignees      | membership_id               | memberships                  | id            | workflow_step_assignees_membership_id_fkey                  | NO ACTION   | CASCADE     |
| workflow_step_assignees      | role_id                     | roles                        | id            | workflow_step_assignees_role_id_fkey                        | NO ACTION   | CASCADE     |
| workflow_step_assignees      | workflow_step_id            | workflow_steps               | id            | workflow_step_assignees_workflow_step_id_fkey               | NO ACTION   | CASCADE     |
| workflow_steps               | department_id               | departments                  | id            | workflow_steps_department_id_fkey                           | NO ACTION   | SET NULL    |
| workflow_steps               | workflow_template_id        | workflow_templates           | id            | workflow_steps_workflow_template_id_fkey                    | NO ACTION   | CASCADE     |
| workflow_templates           | applies_to_case_type_id     | case_types                   | id            | workflow_templates_applies_to_case_type_id_fkey             | NO ACTION   | SET NULL    |
| workflow_templates           | case_type_id                | case_types                   | id            | fk_workflow_case_type                                       | NO ACTION   | NO ACTION   |
| workflow_templates           | organization_id             | organizations                | id            | workflow_templates_organization_id_fkey                     | NO ACTION   | CASCADE     |
