# Raport pełnej paczki testów UNIQA (EIM / PoC)

**Data przebiegu:** 2026-09-11 11:33:50 UTC
**Środowisko:** UNIQA QA (`nr-qa-uniqa.symphonyai.dev`)
**Branch:** `project/uniqa`
**Runner:** Playwright · projekt `chromium` · `workers=1` · storageState
**Źródło wyników:** `docs/test-reports/uniqa-full-results.json`
**Czas (suma / stats):** 214.2s
**Wynik:** **PASS**

## Podsumowanie

| Metryka | Wartość |
|---|---|
| Łącznie | 97 |
| ✅ Passed | 92 |
| ⏭ Skipped | 5 |
| ❌ Failed | 0 |
| Werdykt | **PASS** |

### Według obszaru

| Obszar | Passed | Skipped | Failed |
|---|---:|---:|---:|
| Auth | 7 | 0 | 0 |
| Shell | 2 | 0 | 0 |
| Administration | 2 | 0 | 0 |
| Cross-cutting | 2 | 0 | 0 |
| Group Work | 25 | 2 | 0 |
| My Work | 5 | 0 | 0 |
| Menu | 49 | 3 | 0 |

## Wykresy

_Wersja HTML zawiera wykresy SVG (kołowy statusów, słupkowy obszarów, pasek pokrycia EIM)._

## Pokrycie EIM Workflow Spec (UNIQA-6)

Kontekst: [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6). Paczka PoC jest **non-destructive** — celowo bez claim/assign/detail transitions.

| Obszar EIM | Ref | Status pokrycia | Evidencja w testach |
|---|---|---|---|
| Nawigacja / dostęp do worklist EIM | UNIQA-6 — worklists & analyst entry points | ✅ covered | Menu smoke Group Work + My Work; sibling chrome; My Work worklists |
| All Alerts — wyszukiwanie / filtry (core + supplementary) | UNIQA-6 — alert search criteria surface | ✅ covered | all-alerts-filters, all-alerts-core-fields, OU apply UX |
| Matching Alerts — model kolumn listy | UNIQA-6 — alert list / assignment visibility | ✅ covered | grid-headers, grid-columns (required + optional inventory) |
| Wymiar organizacyjny (OU) na listach i w Admin | UNIQA-6 / org traceability | ✅ covered | OU filter, Admin OU read-only, OU option consistency |
| Odporność Search (wynik pusty / nonsense) | UNIQA-6 — resilient search UX | ✅ covered | negative Alert ID / Customer / Case Identifier |
| My Work — kolejki analityka (Alerts/Cases/…) | UNIQA-6 — analyst personal worklists | 🟡 partial | worklist chrome + empty-or-rows; bez Get Next / claim |
| Claim / Assign / Unassign alertu | UNIQA-6 — assignment transitions | ⬜ gap | celowo out of scope (non-destructive PoC) |
| Alert detail — przejścia stanów workflow | UNIQA-6 — state machine / disposition | ⬜ gap | celowo out of scope |
| Hibernate / Close / Create Case z alertu | UNIQA-6 — case linkage & lifecycle | ⬜ gap | celowo out of scope |
| Get Next Alert (akcja biznesowa) | UNIQA-6 — work intake | ⬜ gap | tylko open-only w menu smoke (jeśli obecne) |

## Scenariusze — opis, status, czas

### Krok 0 — Auth

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | authenticate as admin | Loguje admina i zapisuje storageState (.auth/user.json). | 2.8s |
| ✅ passed | shell header is visible for logged-in admin | Weryfikuje, że storageState otwiera shell admina bez ponownego logowania. | 1.8s |
| ✅ passed | authenticate as admin | Loguje admina i zapisuje storageState (.auth/user.json). | 2.9s |
| ✅ passed | admin can log in successfully | Scenariusz logowania UI (credentials) — smoke ścieżki login. | 2.8s |
| ✅ passed | admin can log out successfully | Wylogowanie i brak chrome admina po logout. | 2.2s |
| ✅ passed | logged-out user cannot see admin shell chrome | Wylogowanie i brak chrome admina po logout. | 2.9s |
| ✅ passed | login and logout as admin | Pełny cykl login→logout (legacy check-login). | 2.9s |

### Krok 0 — Shell

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | shell header and user menu are visible | Chrome nagłówka shella i menu użytkownika (logout widoczne). | 1.7s |
| ✅ passed | user menu opens and exposes logout | Chrome nagłówka shella i menu użytkownika (logout widoczne). | 1.8s |

### Krok 1 — Menu

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | Users opens (home_administration_home_administration_authentication_base_userlist_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | Groups opens (home_administration_home_administration_authentication_base_grouplist_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Roles opens (home_administration_home_administration_authorisation_base_rolelist_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Domains opens (home_administration_home_administration_authorisation_base_domainlist_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Organizational Units opens (home_administration_home_administration_authorisation_base_orgunitlist_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Audit Log Search opens (home_administration_home_administration_auditing_base_auditlogsearch_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | Menu Editor opens (home_administration_home_administration_configmanagement_base_menueditor_caption) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Customers opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_customers_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Associated Parties opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_associated_parties_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | Counterparties opens (menu-item_back_office_path_menu-item_subjects_path_menu-item_counterparties_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | Policies opens (menu-item_back_office_path_menu-item_policies_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | View All Applications opens (configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_viewall) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | New Application opens (configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_create) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Workflows opens (home_workflowconfigurator_home_workflowconfigurator_selectworkflow) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | Scenario Manager opens (home_scenariomanager_scenariomanager_scenariomanager_dux) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.7s |
| ✅ passed | Services Configuration opens (home_services_services_configuration) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | Export Configuration opens (home_services_services_configuration_export) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ⏭ skipped | Reload Configuration opens (home_services_services_configuration_reload) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). |  |
| ✅ passed | Send Test Message opens (home_services_send_test_message) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Error Log opens (home_services_error_log) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Configuration opens (home_command_and_control_home_command_and_control_configuration) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ⏭ skipped | Reload Configuration opens (home_command_and_control_home_command_and_control_configuration_reload) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). |  |
| ✅ passed | Report Builder opens (home_command_and_control_home_command_and_control_report_builder) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Risk Model Simulation opens (menu-item_compliance_simulation_path_menu-item_cdd_simulation_path_menu-item_risk_model_simulation_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Customer Risk Dashboard opens (menu-item_dashboards_path_menu-item_customer_risk_dashboard_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Alerts Dashboard opens (menu-item_dashboards_path_menu-item_alerts_dashboard_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Cases Dashboard opens (menu-item_dashboards_path_menu-item_cases_dashboard_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | ML Dashboard opens (menu-item_dashboards_path_menu-item_ml_dashboard_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Detection Dashboard opens (menu-item_dashboards_path_menu-item_detection_dashboard_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | All Alerts opens (menu-item_group_work_path_menu-item_all_alerts_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | Hibernated Alerts opens (menu-item_group_work_path_menu-item_hibernated_alerts_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | Alerting Subjects opens (menu-item_group_work_path_menu-item_alerting_subjects_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | All Cases opens (menu-item_group_work_path_menu-item_all_cases_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | All Minor Groups opens (menu-item_group_work_path_menu-item_all_minor_groups_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ⏭ skipped | All E-Files opens (menu-item_group_work_path_menu-item_all_e-files_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). |  |
| ✅ passed | Home opens (menu-item_my_work_path_menu-item_home_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | My Active Alerts opens (menu-item_my_work_path_menu-item_my_alerts_path_menu-item_my_activealerts_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Create Alert opens (menu-item_my_work_path_menu-item_my_alerts_path_menu-item_create_alert_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Get Next Alert opens (menu-item_my_work_path_menu-item_get_next_alert_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.5s |
| ✅ passed | My Active Cases opens (menu-item_my_work_path_menu-item_my_cases_path_menu-item_my_active_cases_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | Create Case opens (menu-item_my_work_path_menu-item_my_cases_path_menu-item_create_case_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | My Minor Groups opens (menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_my_minor_groups_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.3s |
| ✅ passed | Create Minor Group opens (menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_create_minor_group_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Daily View opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_daily_view_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Weekly View opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_weekly_view_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Overdue opens (menu-item_my_work_path_menu-item_my_tasks_path_menu-item_overdue_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | Daily View opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_daily_view_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.2s |
| ✅ passed | Weekly View opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_weekly_view_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.0s |
| ✅ passed | Overdue opens (menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_overdue_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Inbox opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_inbox_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Sent Items opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_sent_items_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |
| ✅ passed | Deleted Items opens (menu-item_my_work_path_menu-item_my_notifications_path_menu-item_deleted_items_path) | Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł). | 2.1s |

### Krok 2 — Group Work

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | 1.1 primary regions are visible | All Alerts: widoczne główne regiony formularza wyszukiwania i wyników. | 2.3s |
| ✅ passed | 2.1 Organization Unit dropdown is available | All Alerts: dropdown Organization Unit dostępny pod Supplementary Attributes. | 2.1s |
| ✅ passed | 2.2 other filter dropdowns are available | All Alerts: pozostałe filtry select (Domain, Source, Active, Priority, Status). | 2.3s |
| ✅ passed | 2.3 Organization Unit participates in filter UX | All Alerts: wybór OU uczestniczy w UX filtrów (apply bez destrukcji). | 3.2s |
| ✅ passed | 3.1 actions and grid chrome are present | All Alerts: chrome akcji i siatki Matching Alerts. | 2.5s |

### Krok 3 — Group Work

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | B.1 Core Attributes fields are present | All Alerts Core Attributes: pola search (Alert ID, Assigned, daty, customer…). | 2.3s |
| ✅ passed | B.2 negative Alert ID search keeps shell usable | Negatywne search po Alert ID — shell pozostaje używalny. | 2.6s |
| ✅ passed | B.3 fill-and-clear Main Customer Name | Wypełnij i wyczyść Main Customer Name — reset formularza. | 2.5s |
| ✅ passed | A.1 required Matching Alerts headers remain present | Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …). | 2.5s |
| ✅ passed | A.1 Hibernated Alerts opens with search/results landmarks | Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …). | 2.1s |
| ✅ passed | A.2 Hibernated Alerts Organization Unit when present | Sibling: OU select gdy obecny na ekranie. | 2.2s |
| ✅ passed | A.1 Alerting Subjects opens with search/results landmarks | Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …). | 2.2s |
| ✅ passed | A.2 Alerting Subjects Organization Unit when present | Sibling: OU select gdy obecny na ekranie. | 2.1s |
| ✅ passed | A.1 All Cases opens with search/results landmarks | Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …). | 2.2s |
| ✅ passed | A.2 All Cases Organization Unit when present | Sibling: OU select gdy obecny na ekranie. | 2.2s |
| ✅ passed | A.1 All Minor Groups opens with search/results landmarks | Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …). | 2.1s |
| ✅ passed | A.2 All Minor Groups Organization Unit when present | Sibling: OU select gdy obecny na ekranie. | 2.2s |
| ⏭ skipped | A.1 All E-Files opens with search/results landmarks | Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …). | 1.8s |
| ⏭ skipped | A.2 All E-Files Organization Unit when present | Sibling: OU select gdy obecny na ekranie. | 1.7s |

### Krok 3–4 — Group Work

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | A.4 filter-row control under Alert Identifier or Type/Sub-Type | Chrome wiersza filtrów kolumn na siatce wyników. | 2.4s |
| ✅ passed | C.1 required Matching Alerts column headers are present | Wymagane nagłówki Matching Alerts (Alert ID, Type, Priority, Status, OU, Assigned To). | 2.5s |
| ✅ passed | C.2 grid column filter row chrome is present | Chrome wiersza filtrów kolumn na siatce wyników. | 2.5s |

### Krok 4 — Administration

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | C.1 Organizational Units list opens | Admin → Organizational Units: lista otwiera się (read-only). | 2.2s |
| ✅ passed | C.2 list has identity columns / rows chrome | Admin OU: kolumny Code/Name / chrome wierszy. | 2.1s |

### Krok 4 — Cross-cutting

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | D.1–D.2 Admin OU codes overlap All Alerts OU select | Nakładanie kodów/nazw Admin OU vs select All Alerts OU. | 2.4s |
| ✅ passed | D.3 sibling OU selects remain populated when present | Sibling Group Work: OU selecty populowane gdy obecne. | 2.5s |

### Krok 4 — Group Work

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | A.2 optional Matching Alerts columns soft inventory | Soft inventory opcjonalnych kolumn (Description, Age, Customer…). | 2.6s |
| ✅ passed | A.3 required header relative order soft-check | Soft-check względnej kolejności wymaganych nagłówków. | 2.4s |
| ✅ passed | E.1 negative Alert ID search keeps shell usable | Negatywne Alert ID (rozszerzony negative Search). | 2.6s |
| ✅ passed | E.2 negative Main Customer Name search keeps shell usable | Negatywne Main Customer Name — pusty wynik, shell OK. | 2.9s |
| ✅ passed | E.3 negative Case Identifier search keeps shell usable | Negatywne Case Identifier — pusty wynik, shell OK. | 2.9s |

### Krok 4 — My Work

| Status | Scenariusz | Co robi | Czas |
|---|---|---|---|
| ✅ passed | B.1 My Active Alerts shows list/grid chrome | My Work worklist: tabela lub empty-state (bez Get Next / claim). | 2.4s |
| ✅ passed | B.1 My Active Cases shows list/grid chrome | My Work worklist: tabela lub empty-state (bez Get Next / claim). | 2.4s |
| ✅ passed | B.1 My Minor Groups shows list/grid chrome | My Work worklist: tabela lub empty-state (bez Get Next / claim). | 2.1s |
| ✅ passed | B.2 Daily View landmark chrome | My Work ekran: landmarki chrome (np. Inbox / Tasks). | 2.2s |
| ✅ passed | B.2 Inbox landmark chrome | My Work ekran: landmarki chrome (np. Inbox / Tasks). | 2.1s |

## Plany / artefakty

- `specs/uniqa-admin-menu-screens.md` — krok 1 menu smoke
- `specs/uniqa-group-work-all-alerts.md` — krok 2 filtry All Alerts
- `specs/uniqa-group-work-siblings-and-all-alerts-core.md` — krok 3 siblings/core/headers
- `specs/uniqa-matching-columns-my-work-ou-negative.md` — krok 4 columns/My Work/OU/negative
