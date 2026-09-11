# Raport testów UNIQA — Kroki 1 i 2 (Generator)

**Data przebiegu:** 2026-09-11 09:19 UTC  
**Środowisko:** UNIQA QA (`nr-qa-uniqa.symphonyai.dev`)  
**Branch:** `cursor/uniqa-all-alerts-filters-6c8c` / `project/uniqa`  
**Runner:** Playwright Test · projekt `chromium` · storageState  
**Czas całkowity:** 1.0m  

## Podsumowanie

| Metryka | Wartość |
|---|---|
| Łącznie uruchomionych | 58 |
| ✅ Passed | 55 |
| ⏭ Skipped | 3 |
| ❌ Failed | 0 |
| Wynik | **PASS** |

### Według kroku

| Krok | Opis | Passed | Skipped | Failed |
|---|---|---:|---:|---:|
| — | Auth setup | 1 | 0 | 0 |
| 1 | Generator 1 — Menu smoke | 49 | 3 | 0 |
| 2 | Generator 2 — All Alerts filters | 5 | 0 | 0 |

## Krok 1 — Menu smoke (`tests/ui/menu/`)

Plan: `specs/uniqa-admin-menu-screens.md` · PR #5

### Menu smoke — Administration screens

| Status | Test | Czas |
|---|---|---|
| ✅ passed | Users opens (home_administration_home_administration_authentication_base_userlist_caption) | 2.0s |
| ✅ passed | Groups opens (home_administration_home_administration_authentication_base_grouplist_caption) | 2.0s |
| ✅ passed | Roles opens (home_administration_home_administration_authorisation_base_rolelist_caption) | 2.1s |
| ✅ passed | Domains opens (home_administration_home_administration_authorisation_base_domainlist_caption) | 2.0s |
| ✅ passed | Organizational Units opens (home_administration_home_administration_authorisation_base_orgunitlist_caption) | 2.0s |
| ✅ passed | Audit Log Search opens (home_administration_home_administration_auditing_base_auditlogsearch_caption) | 2.2s |
| ✅ passed | Menu Editor opens (home_administration_home_administration_configmanagement_base_menueditor_caption) | 2.2s |

### Menu smoke — Back Office screens

| Status | Test | Czas |
|---|---|---|
| ✅ passed | Customers opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_customers_path) | 2.0s |
| ✅ passed | Associated Parties opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_associated_parties_path) | 2.1s |
| ✅ passed | Counterparties opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_counterparties_path) | 2.0s |
| ✅ passed | Policies opens (menu-item_back_office_path_menu-item_policies_path) | 2.0s |

### Menu smoke — Builders and managers screens

| Status | Test | Czas |
|---|---|---|
| ✅ passed | View All Applications opens (configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_viewall) | 2.0s |
| ✅ passed | New Application opens (configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_create) | 2.0s |
| ✅ passed | Workflows opens (home_workflowconfigurator_home_workflowconfigurator_selectworkflow) | 2.1s |
| ✅ passed | Scenario Manager opens (home_scenariomanager_scenariomanager_scenariomanager_dux) | 2.6s |
| ✅ passed | Services Configuration opens (home_services_services_configuration) | 2.0s |
| ⏭ skipped | Reload Configuration opens (home_services_services_configuration_reload) |  |
| ✅ passed | Export Configuration opens (home_services_services_configuration_export) | 2.0s |
| ✅ passed | Send Test Message opens (home_services_send_test_message) | 2.0s |
| ✅ passed | Error Log opens (home_services_error_log) | 2.1s |
| ⏭ skipped | Reload Configuration opens (home_command_and_control_home_command_and_control_configuration_reload) |  |
| ✅ passed | Configuration opens (home_command_and_control_home_command_and_control_configuration) | 2.0s |
| ✅ passed | Report Builder opens (home_command_and_control_home_command_and_control_report_builder) | 2.0s |
| ✅ passed | Risk Model Simulation opens (menu-item_compliance_simulation_path_menu-item_cdd_simulation_path_menu-item_risk_model_simulation_path) | 2.0s |

### Menu smoke — Dashboards screens

| Status | Test | Czas |
|---|---|---|
| ✅ passed | Customer Risk Dashboard opens (menu-item_dashboards_path_menu-item_customer_risk_dashboard_path) | 2.0s |
| ✅ passed | Alerts Dashboard opens (menu-item_dashboards_path_menu-item_alerts_dashboard_path) | 2.1s |
| ✅ passed | Cases Dashboard opens (menu-item_dashboards_path_menu-item_cases_dashboard_path) | 2.0s |
| ✅ passed | ML Dashboard opens (menu-item_dashboards_path_menu-item_ml_dashboard_path) | 2.1s |
| ✅ passed | Detection Dashboard opens (menu-item_dashboards_path_menu-item_detection_dashboard_path) | 2.0s |

### Menu smoke — Group Work screens

| Status | Test | Czas |
|---|---|---|
| ✅ passed | All Alerts opens (menu-item_group_work_path_menu-item_all_alerts_path) | 2.0s |
| ✅ passed | Hibernated Alerts opens (menu-item_group_work_path_menu-item_hibernated_alerts_path) | 2.0s |
| ✅ passed | Alerting Subjects opens (menu-item_group_work_path_menu-item_alerting_subjects_path) | 2.1s |
| ✅ passed | All Cases opens (menu-item_group_work_path_menu-item_all_cases_path) | 2.1s |
| ⏭ skipped | All E-Files opens (menu-item_group_work_path_menu-item_all_e-files_path) |  |
| ✅ passed | All Minor Groups opens (menu-item_group_work_path_menu-item_all_minor_groups_path) | 2.0s |

### Menu smoke — My Work screens

| Status | Test | Czas |
|---|---|---|
| ✅ passed | Home opens (menu-item_my_work_path_menu-item_home_path) | 1.9s |
| ✅ passed | My Active Alerts opens (menu-item_my_work_path_menu-item_my_alerts_path_menu-item_my_activealerts_path) | 2.2s |
| ✅ passed | Create Alert opens (menu-item_my_work_path_menu-item_my_alerts_path_menu-item_create_alert_path) | 2.2s |
| ✅ passed | Get Next Alert opens (menu-item_my_work_path_menu-item_get_next_alert_path) | 2.0s |
| ✅ passed | My Active Cases opens (menu-item_my_work_path_menu-item_my_cases_path_menu-item_my_active_cases_path) | 2.2s |
| ✅ passed | Create Case opens (menu-item_my_work_path_menu-item_my_cases_path_menu-item_create_case_path) | 2.0s |
| ✅ passed | My Minor Groups opens (menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_my_minor_groups_path) | 2.0s |
| ✅ passed | Create Minor Group opens (menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_create_minor_group_path) | 2.1s |
| ✅ passed | Daily View opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_daily_view_path) | 2.0s |
| ✅ passed | Weekly View opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_weekly_view_path) | 2.1s |
| ✅ passed | Overdue opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_overdue_path) | 2.0s |
| ✅ passed | Daily View opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_daily_view_path) | 2.0s |
| ✅ passed | Weekly View opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_weekly_view_path) | 2.0s |
| ✅ passed | Overdue opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_overdue_path) | 2.0s |
| ✅ passed | Inbox opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_inbox_path) | 2.0s |
| ✅ passed | Sent Items opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_sent_items_path) | 2.0s |
| ✅ passed | Deleted Items opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_deleted_items_path) | 2.0s |

## Krok 2 — All Alerts filters (`tests/ui/group-work/`)

Plan: `specs/uniqa-group-work-all-alerts.md` · PR #6

### Group Work — All Alerts filters

| Status | Test | Czas |
|---|---|---|
| ✅ passed | 2.1 Organization Unit dropdown is available | 2.1s |
| ✅ passed | 1.1 primary regions are visible | 2.2s |
| ✅ passed | 2.2 other filter dropdowns are available | 2.3s |
| ✅ passed | 2.3 Organization Unit participates in filter UX | 3.0s |

### Group Work — All Alerts grid chrome

| Status | Test | Czas |
|---|---|---|
| ✅ passed | 3.1 actions and grid chrome are present | 2.4s |

## Setup

| Status | Test | Czas |
|---|---|---|
| ✅ passed | authenticate as admin | 3.0s |

## Pominięcia (skipped)

| Test | Powód |
|---|---|
| Reload Configuration opens (home_services_services_configuration_reload) | Services Manager → Reload Configuration hangs the app on UNIQA QA |
| Reload Configuration opens (home_command_and_control_home_command_and_control_configuration_reload) | Command And Control → Reload Configuration is destructive / unstable |
| All E-Files opens (menu-item_group_work_path_menu-item_all_e-files_path) | All E-Files is not present in the UNIQA QA menu for this admin user |

## Artefakty

- Log przebiegu: `reports/uniqa-steps-1-2-run.log`
- Raport HTML Playwright: `playwright-report/index.html`
- Ten raport: `reports/uniqa-steps-1-2-report.md`

## Werdykt

**Kroki 1 i 2 Generatora — zaliczone na UNIQA QA.**  
55 testów passed, 3 celowo skipped (Reload Configuration ×2, All E-Files). Zero failures.
