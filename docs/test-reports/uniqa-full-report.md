# UNIQA full test suite report (EIM / PoC)

**Run date:** 2026-09-11 12:38:37 UTC
**Environment:** UNIQA QA (`nr-qa-uniqa.symphonyai.dev`)
**Branch:** `project/uniqa`
**Runner:** Playwright · project `chromium` · `workers=1` · storageState
**Results source:** `docs/test-reports/uniqa-full-results.json`
**Duration (sum / stats):** 214.2s
**Result:** **PASS**

## Summary

| Metric | Value |
|---|---|
| Total | 97 |
| ✅ Passed | 92 |
| ⏭ Skipped | 5 |
| ❌ Failed | 0 |
| Verdict | **PASS** |

### By area

| Area | Passed | Skipped | Failed |
|---|---:|---:|---:|
| Auth | 7 | 0 | 0 |
| Shell | 2 | 0 | 0 |
| Administration | 2 | 0 | 0 |
| Cross-cutting | 2 | 0 | 0 |
| Group Work | 25 | 2 | 0 |
| My Work | 5 | 0 | 0 |
| Menu | 49 | 3 | 0 |

## Charts

_The HTML version includes SVG charts (status pie, area bars, EIM coverage bar)._

## EIM Workflow Spec coverage (UNIQA-6)

Context: [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6). The PoC pack is **non-destructive** — intentionally without claim/assign/detail transitions.

| EIM area | Ref | Coverage status | Evidence in tests |
|---|---|---|---|
| Navigation / access to EIM worklists | UNIQA-6 — worklists & analyst entry points | ✅ covered | Menu smoke Group Work + My Work; sibling chrome; My Work worklists |
| All Alerts — search / filters (core + supplementary) | UNIQA-6 — alert search criteria surface | ✅ covered | all-alerts-filters, all-alerts-core-fields, OU apply UX |
| Matching Alerts — list column model | UNIQA-6 — alert list / assignment visibility | ✅ covered | grid-headers, grid-columns (required + optional inventory) |
| Organizational dimension (OU) on lists and in Admin | UNIQA-6 / org traceability | ✅ covered | OU filter, Admin OU read-only, OU option consistency |
| Search resilience (empty / nonsense results) | UNIQA-6 — resilient search UX | ✅ covered | negative Alert ID / Customer / Case Identifier |
| My Work — analyst queues (Alerts/Cases/…) | UNIQA-6 — analyst personal worklists | 🟡 partial | worklist chrome + empty-or-rows; no Get Next / claim |
| Claim / Assign / Unassign alert | UNIQA-6 — assignment transitions | ⬜ gap | intentionally out of scope (non-destructive PoC) |
| Alert detail — workflow state transitions | UNIQA-6 — state machine / disposition | ⬜ gap | intentionally out of scope |
| Hibernate / Close / Create Case from alert | UNIQA-6 — case linkage & lifecycle | ⬜ gap | intentionally out of scope |
| Get Next Alert (business action) | UNIQA-6 — work intake | ⬜ gap | open-only in menu smoke only (if present) |

## Scenarios — description, status, duration

### Step 0 — Auth

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | authenticate as admin | Logs in as admin and saves storageState (.auth/user.json). | 2.8s |
| ✅ passed | shell header is visible for logged-in admin | Verifies storageState opens the admin shell without re-login. | 1.8s |
| ✅ passed | authenticate as admin | Logs in as admin and saves storageState (.auth/user.json). | 2.9s |
| ✅ passed | admin can log in successfully | UI login scenario (credentials) — login path smoke. | 2.8s |
| ✅ passed | admin can log out successfully | Logout and absence of admin chrome after logout. | 2.2s |
| ✅ passed | logged-out user cannot see admin shell chrome | Logout and absence of admin chrome after logout. | 2.9s |
| ✅ passed | login and logout as admin | Full login→logout cycle (legacy check-login). | 2.9s |

### Step 0 — Shell

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | shell header and user menu are visible | Shell header chrome and user menu (logout visible). | 1.7s |
| ✅ passed | user menu opens and exposes logout | Shell header chrome and user menu (logout visible). | 1.8s |

### Step 1 — Menu

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | Users opens (home_administration_home_administration_authentication_base_userlist_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | Groups opens (home_administration_home_administration_authentication_base_grouplist_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Roles opens (home_administration_home_administration_authorisation_base_rolelist_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Domains opens (home_administration_home_administration_authorisation_base_domainlist_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Organizational Units opens (home_administration_home_administration_authorisation_base_orgunitlist_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Audit Log Search opens (home_administration_home_administration_auditing_base_auditlogsearch_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | Menu Editor opens (home_administration_home_administration_configmanagement_base_menueditor_caption) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Customers opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_customers_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Associated Parties opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_associated_parties_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | Counterparties opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_counterparties_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | Policies opens (menu-item_back_office_path_menu-item_policies_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | View All Applications opens (configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_viewall) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | New Application opens (configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_create) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Workflows opens (home_workflowconfigurator_home_workflowconfigurator_selectworkflow) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | Scenario Manager opens (home_scenariomanager_scenariomanager_scenariomanager_dux) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.7s |
| ✅ passed | Services Configuration opens (home_services_services_configuration) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | Export Configuration opens (home_services_services_configuration_export) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ⏭ skipped | Reload Configuration opens (home_services_services_configuration_reload) | Smoke: menu navigation → screen opens without error (landmark / title). |  |
| ✅ passed | Send Test Message opens (home_services_send_test_message) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Error Log opens (home_services_error_log) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Configuration opens (home_command_and_control_home_command_and_control_configuration) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ⏭ skipped | Reload Configuration opens (home_command_and_control_home_command_and_control_configuration_reload) | Smoke: menu navigation → screen opens without error (landmark / title). |  |
| ✅ passed | Report Builder opens (home_command_and_control_home_command_and_control_report_builder) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Risk Model Simulation opens (menu-item_compliance_simulation_path_menu-item_cdd_simulation_path_menu-item_risk_model_simulation_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Customer Risk Dashboard opens (menu-item_dashboards_path_menu-item_customer_risk_dashboard_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Alerts Dashboard opens (menu-item_dashboards_path_menu-item_alerts_dashboard_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Cases Dashboard opens (menu-item_dashboards_path_menu-item_cases_dashboard_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | ML Dashboard opens (menu-item_dashboards_path_menu-item_ml_dashboard_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Detection Dashboard opens (menu-item_dashboards_path_menu-item_detection_dashboard_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | All Alerts opens (menu-item_group_work_path_menu-item_all_alerts_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | Hibernated Alerts opens (menu-item_group_work_path_menu-item_hibernated_alerts_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | Alerting Subjects opens (menu-item_group_work_path_menu-item_alerting_subjects_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | All Cases opens (menu-item_group_work_path_menu-item_all_cases_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | All Minor Groups opens (menu-item_group_work_path_menu-item_all_minor_groups_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ⏭ skipped | All E-Files opens (menu-item_group_work_path_menu-item_all_e-files_path) | Smoke: menu navigation → screen opens without error (landmark / title). |  |
| ✅ passed | Home opens (menu-item_my_work_path_menu-item_home_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | My Active Alerts opens (menu-item_my_work_path_menu-item_my_alerts_path_menu-item_my_activealerts_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Create Alert opens (menu-item_my_work_path_menu-item_my_alerts_path_menu-item_create_alert_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Get Next Alert opens (menu-item_my_work_path_menu-item_get_next_alert_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.5s |
| ✅ passed | My Active Cases opens (menu-item_my_work_path_menu-item_my_cases_path_menu-item_my_active_cases_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | Create Case opens (menu-item_my_work_path_menu-item_my_cases_path_menu-item_create_case_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | My Minor Groups opens (menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_my_minor_groups_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.3s |
| ✅ passed | Create Minor Group opens (menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_create_minor_group_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Daily View opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_daily_view_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Weekly View opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_weekly_view_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Overdue opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_overdue_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | Daily View opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_daily_view_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.2s |
| ✅ passed | Weekly View opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_weekly_view_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.0s |
| ✅ passed | Overdue opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_overdue_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Inbox opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_inbox_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Sent Items opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_sent_items_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |
| ✅ passed | Deleted Items opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_deleted_items_path) | Smoke: menu navigation → screen opens without error (landmark / title). | 2.1s |

### Step 2 — Group Work

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | 1.1 primary regions are visible | All Alerts: primary search form and results regions are visible. | 2.3s |
| ✅ passed | 2.1 Organization Unit dropdown is available | All Alerts: Organization Unit dropdown available under Supplementary Attributes. | 2.1s |
| ✅ passed | 2.2 other filter dropdowns are available | All Alerts: other filter selects (Domain, Source, Active, Priority, Status). | 2.3s |
| ✅ passed | 2.3 Organization Unit participates in filter UX | All Alerts: OU selection participates in filter UX (apply without destructive actions). | 3.2s |
| ✅ passed | 3.1 actions and grid chrome are present | All Alerts: Matching Alerts actions and grid chrome. | 2.5s |

### Step 3 — Group Work

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | B.1 Core Attributes fields are present | All Alerts Core Attributes: search fields (Alert ID, Assigned, dates, customer…). | 2.3s |
| ✅ passed | B.2 negative Alert ID search keeps shell usable | Negative Alert ID search — shell remains usable. | 2.6s |
| ✅ passed | B.3 fill-and-clear Main Customer Name | Fill and clear Main Customer Name — form reset. | 2.5s |
| ✅ passed | A.1 required Matching Alerts headers remain present | Sibling Group Work: search/results landmarks (Hibernated, Subjects, Cases, …). | 2.5s |
| ✅ passed | A.1 Hibernated Alerts opens with search/results landmarks | Sibling Group Work: search/results landmarks (Hibernated, Subjects, Cases, …). | 2.1s |
| ✅ passed | A.2 Hibernated Alerts Organization Unit when present | Sibling: OU select when present on the screen. | 2.2s |
| ✅ passed | A.1 Alerting Subjects opens with search/results landmarks | Sibling Group Work: search/results landmarks (Hibernated, Subjects, Cases, …). | 2.2s |
| ✅ passed | A.2 Alerting Subjects Organization Unit when present | Sibling: OU select when present on the screen. | 2.1s |
| ✅ passed | A.1 All Cases opens with search/results landmarks | Sibling Group Work: search/results landmarks (Hibernated, Subjects, Cases, …). | 2.2s |
| ✅ passed | A.2 All Cases Organization Unit when present | Sibling: OU select when present on the screen. | 2.2s |
| ✅ passed | A.1 All Minor Groups opens with search/results landmarks | Sibling Group Work: search/results landmarks (Hibernated, Subjects, Cases, …). | 2.1s |
| ✅ passed | A.2 All Minor Groups Organization Unit when present | Sibling: OU select when present on the screen. | 2.2s |
| ⏭ skipped | A.1 All E-Files opens with search/results landmarks | Sibling Group Work: search/results landmarks (Hibernated, Subjects, Cases, …). | 1.8s |
| ⏭ skipped | A.2 All E-Files Organization Unit when present | Sibling: OU select when present on the screen. | 1.7s |

### Step 3–4 — Group Work

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | A.4 filter-row control under Alert Identifier or Type/Sub-Type | Column filter-row chrome on the results grid. | 2.4s |
| ✅ passed | C.1 required Matching Alerts column headers are present | Required Matching Alerts headers (Alert ID, Type, Priority, Status, OU, Assigned To). | 2.5s |
| ✅ passed | C.2 grid column filter row chrome is present | Column filter-row chrome on the results grid. | 2.5s |

### Step 4 — Administration

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | C.1 Organizational Units list opens | Admin → Organizational Units: list opens (read-only). | 2.2s |
| ✅ passed | C.2 list has identity columns / rows chrome | Admin OU: Code/Name columns / row chrome. | 2.1s |

### Step 4 — Cross-cutting

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | D.1–D.2 Admin OU codes overlap All Alerts OU select | Overlap of Admin OU codes/names vs All Alerts OU select. | 2.4s |
| ✅ passed | D.3 sibling OU selects remain populated when present | Sibling Group Work: OU selects populated when present. | 2.5s |

### Step 4 — Group Work

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | A.2 optional Matching Alerts columns soft inventory | Soft inventory of optional columns (Description, Age, Customer…). | 2.6s |
| ✅ passed | A.3 required header relative order soft-check | Soft-check of relative order of required headers. | 2.4s |
| ✅ passed | E.1 negative Alert ID search keeps shell usable | Negative Alert ID (extended negative Search). | 2.6s |
| ✅ passed | E.2 negative Main Customer Name search keeps shell usable | Negative Main Customer Name — empty result, shell OK. | 2.9s |
| ✅ passed | E.3 negative Case Identifier search keeps shell usable | Negative Case Identifier — empty result, shell OK. | 2.9s |

### Step 4 — My Work

| Status | Scenario | What it does | Duration |
|---|---|---|---|
| ✅ passed | B.1 My Active Alerts shows list/grid chrome | My Work worklist: table or empty-state (no Get Next / claim). | 2.4s |
| ✅ passed | B.1 My Active Cases shows list/grid chrome | My Work worklist: table or empty-state (no Get Next / claim). | 2.4s |
| ✅ passed | B.1 My Minor Groups shows list/grid chrome | My Work worklist: table or empty-state (no Get Next / claim). | 2.1s |
| ✅ passed | B.2 Daily View landmark chrome | My Work screen: chrome landmarks (e.g. Inbox / Tasks). | 2.2s |
| ✅ passed | B.2 Inbox landmark chrome | My Work screen: chrome landmarks (e.g. Inbox / Tasks). | 2.1s |

## Plans / artifacts

- `specs/uniqa-admin-menu-screens.md` — step 1 menu smoke
- `specs/uniqa-group-work-all-alerts.md` — step 2 All Alerts filters
- `specs/uniqa-group-work-siblings-and-all-alerts-core.md` — step 3 siblings/core/headers
- `specs/uniqa-matching-columns-my-work-ou-negative.md` — step 4 columns/My Work/OU/negative
