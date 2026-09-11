# UNIQA — Group Work siblings + All Alerts core fields / grid headers

## Application Overview

Cheap follow-up plan after:

- `specs/uniqa-admin-menu-screens.md` (menu open smoke — **done**)
- `specs/uniqa-group-work-all-alerts.md` (All Alerts dropdowns / Organization Unit — **done**)

This plan deepens **EIM worklist coverage** (UNIQA-6 context) with **low-cost, non-destructive** UI checks:

1. **Group Work sibling screens** — same pattern as All Alerts: shell + filter region + results region (no claim/assign).
2. **All Alerts core search fields** — Core Attributes (and visible text/date inputs), not only Supplementary dropdowns.
3. **All Alerts Matching Alerts grid headers** — column presence aligned with EIM alert list semantics.

**Seed:** `tests/seed.spec.ts`  
**Docs (context):** [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6),
[UNIQA-3 Interface Format Specification](https://netreveal.atlassian.net/browse/UNIQA-3)  
**Environment:** branch `project/uniqa` + UNIQA QA (`storageState`)

**Session model:**

- Use `storageState` from `tests/auth.setup.ts`.
- **Do not** re-login in scenarios.
- **Do not** open Change password.
- **Do not** navigate to Services Manager → Reload Configuration (or other Reload * actions).
- **Do not** claim / assign / close / create alerts or cases.

**Implementation conventions (for Generator):**

- Import `test` / `expect` from `tests/fixtures.ts`.
- Reuse `MainMenuPage` + `AllAlertsPage`; add thin POMs only where siblings differ
  (e.g. `HibernatedAlertsPage`, shared `GroupWorkSearchPage` base if helpful).
- Prefer label / role; fall back to stable ids discovered on UNIQA QA (examples below).
- Keep scenarios independent; one concern per test where practical.
- Skip **All E-Files** if leaf still absent for the admin user (same as menu inventory).

**Suggested output paths:**

- `tests/ui/group-work/group-work-siblings.spec.ts`
- `tests/ui/group-work/all-alerts-core-fields.spec.ts`
- `tests/ui/group-work/all-alerts-grid-headers.spec.ts`
- Optional POM helpers under `src/ui/pages/` (extend `AllAlertsPage` rather than duplicating navigation)

**Live leaf ids (Group Work, from menu inventory):**

| Screen | `leafId` |
|---|---|
| All Alerts | `menu-item_group_work_path_menu-item_all_alerts_path` |
| Hibernated Alerts | `menu-item_group_work_path_menu-item_hibernated_alerts_path` |
| Alerting Subjects | `menu-item_group_work_path_menu-item_alerting_subjects_path` |
| All Cases | `menu-item_group_work_path_menu-item_all_cases_path` |
| All Minor Groups | `menu-item_group_work_path_menu-item_all_minor_groups_path` |
| All E-Files | `menu-item_group_work_path_menu-item_all_e-files_path` (**skip if missing**) |

**All Alerts live anchors (UNIQA QA snapshot):**

- Search form: `#EIM_AlertsSearch`
- Results table: `#EIM_AlertsSearchResults_interactiveListTable`
- Core section toggle (if used): `#EIM__AllAlerts_CoreAttributes`
- Supplementary toggle (existing): `#EIM__AllAlerts_SupplementaryAttributes`

---

## Part A — Group Work sibling screen chrome

### A.1 Each sibling opens with search + results landmarks

**Seed:** `tests/seed.spec.ts`

**Screens:** Hibernated Alerts, Alerting Subjects, All Cases, All Minor Groups  
(+ All E-Files only if present)

**Steps:**

1. From authenticated shell, open the sibling via `MainMenuPage.openLeaf`.
2. Assert page title / heading region identifies the worklist (or Search * / Matching * pattern).
3. Assert a **search / filter** region is attached or visible.
4. Assert a **results** region (table/list) is attached — empty data is OK.
5. Assert login form is not shown.

**Expected:**

- Each sibling loads without session loss.
- Filter + results landmarks exist (structure only; no row-content claims).
- Missing All E-Files → `test.skip` with reason (do not fail the suite).

**Notes for Generator:**

- Reuse the All Alerts “primary regions” idea; discover per-screen form/table ids during generation.
- If a sibling has no filter form (list-only), assert list/grid chrome only and document in spec comment.

---

### A.2 Sibling Organization Unit / domain filter when present

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. On each sibling that exposes an Organization Unit (or equivalent org) control, assert it is visible/enabled after expanding any collapsed “Supplementary / Additional” section.
2. Open the control once and assert ≥1 option (empty placeholder allowed as option[0]).
3. Do **not** require applying the filter on every sibling in this plan (All Alerts already covers apply UX).

**Expected:**

- Where the control exists, it is operable.
- Where it does not exist, annotate and continue (optional control).

---

## Part B — All Alerts core search fields

> Complements `specs/uniqa-group-work-all-alerts.md` (dropdown matrix).  
> Here: **Core Attributes** text/date fields and presence of Search/Clear.

### B.1 Core Attributes fields are present

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Open **Group Work → All Alerts**.
2. Ensure **Core Attributes** section is expanded if collapsed (`#EIM__AllAlerts_CoreAttributes`).
3. Assert visibility (or attached+enabled) of core fields by label / id:

| Business label (UNIQA QA) | Example id |
|---|---|
| Alert ID | `#EIM_AlertsSearch__EIM_SearchAlertId` |
| Assigned to | `#EIM_AlertsSearch__EIM_AssignedToSep` |
| Assigned by | `#EIM_AlertsSearch__EIM_AssignedBy_1` |
| Created Between (From/To) | `#EIM_AlertsSearch__EIM_SearchAlertCreatedBetween__FROM` / `__TO` |
| Last Updated Between (From/To) | `#EIM_AlertsSearch__EIM_SearchAlertLastUpdated__FROM` / `__TO` |
| Linked To / Case Name | `#EIM_AlertsSearch__EIM_SearchCaseNane` *(typo in product id — use as-is)* |
| Case Identifier | `#EIM_AlertsSearch__EIM_SearchCaseIdentifier` |
| Main Customer Name | `#EIM_AlertsSearch__EIM_SearchAlertsMainCustomerName` |
| Main Customer ID | `#EIM_AlertsSearch__EIM_SearchCustomerId` |
| Main Employee Name | `#EIM_AlertsSearch__EIM_SearchEmployeeName` |
| Main Employee Id | `#EIM_AlertsSearch__EIM_SearchEmployeeID` |

4. Assert **Search** and **Clear** actions remain visible.

**Expected:**

- Listed core fields are present and enabled (read/fillable — no submit required in B.1).
- Labels may vary slightly; match by `label[for]` / accessible name first, id second.

---

### B.2 Negative search keeps shell usable

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. On All Alerts, enter a non-existent Alert ID (e.g. `NO-SUCH-ALERT-999999`).
2. Click **Search**.
3. Assert still on All Alerts (not login / not change-password).
4. Assert results region still attached; empty-state **or** zero data rows is acceptable.
5. Click **Clear** if visible; assert Alert ID field cleared or form reset.

**Expected:**

- No session loss / no app hang.
- Empty result is success for smoke.
- No alert row actions invoked.

---

### B.3 Optional: fill-and-clear one customer field

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Type a harmless string into **Main Customer Name** (e.g. `SMOKE`).
2. Click **Clear** (preferred) or manually clear — do not depend on matching data.
3. Assert field empty afterward and shell still authenticated.

**Expected:**

- Round-trip fill/clear works without navigation errors.

---

## Part C — All Alerts Matching Alerts grid headers

### C.1 Expected column headers are present

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Open All Alerts; wait for `#EIM_AlertsSearchResults_interactiveListTable` (or current results table id).
2. Assert `thead` header cells include (subset / synonyms OK if caption differs):

| Expected header (business) | Notes |
|---|---|
| Alert Identifier | aka Alert ID |
| Type/Sub-Type | |
| Description | |
| Age in days | |
| Assigned To | |
| Main Customer | |
| Customer Segment | optional if hidden by view |
| Customer Previously Reported | optional |
| Case Name | |
| Priority | |
| Status | |
| Main Employee Name | optional |
| Score | |
| Organization Unit | **EIM / OU traceability** |
| Related Cases | optional |
| Other Details | optional |
| Due Date | optional |

3. Do not fail the whole suite on a single optional column — mark required vs optional in POM constants.
4. **Required minimum for this plan:** Alert Identifier, Type/Sub-Type, Priority, Status, Organization Unit, Assigned To.

**Expected:**

- Required headers visible (or attached in table header row).
- Optional headers: soft-check / annotate if missing (view configuration may hide columns).

---

### C.2 Grid filter row chrome (presence only)

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. If the results table shows a column filter row (`*_filterCell*` / “Type a value”), assert at least one filter input/select is attached.
2. Do not apply column filters that would mutate selection state beyond UI smoke.

**Expected:**

- Filter-row chrome present when enabled by product (`il_filtersEnabled` class was observed on UNIQA).

---

## Out of scope

- Claim / assign / close / hibernate / create alert or case
- Opening alert detail and walking UNIQA-6 state transitions
- Get Next Alert as a business action (open-only remains under menu smoke)
- UNIQA-3 interface payload / API contract tests
- Export downloads, email notify, bulk toolbar destructive actions
- Dashboards charts data correctness
- Administration OU master-data edit
- Services / C&C Reload Configuration

---

## Traceability

| Scenario | Suggested spec | EIM angle | Cost |
|---|---|---|---|
| A.1 Sibling chrome | `group-work-siblings.spec.ts` | worklists beyond All Alerts | low |
| A.2 Sibling OU (if any) | `group-work-siblings.spec.ts` | org dimension on lists | low |
| B.1 Core fields | `all-alerts-core-fields.spec.ts` | search criteria surface | low |
| B.2 Negative search | `all-alerts-core-fields.spec.ts` | resilient empty result | very low |
| B.3 Fill/clear | `all-alerts-core-fields.spec.ts` | form reset | very low |
| C.1 Grid headers | `all-alerts-grid-headers.spec.ts` | alert list model | very low |
| C.2 Column filter row | `all-alerts-grid-headers.spec.ts` | list UX chrome | very low |

**Depends on (already implemented):**

- Menu navigation / `MainMenuPage`
- `AllAlertsPage` + Organization Unit supplementary dropdown coverage
- `tests/ui/group-work/all-alerts-filters.spec.ts`, `all-alerts-grid.spec.ts`

---

## Generator notes

1. Re-snapshot siblings on UNIQA — form/table ids may differ from All Alerts (`EIM_*Search*` patterns vary by entity).
2. Extend `AllAlertsPage` with `assertCoreFields()`, `assertRequiredGridHeaders()`, `searchByAlertId()` rather than new mega-POM.
3. Keep `@plan` / `@seed` headers on each spec file pointing to this document.
4. Commit on **`project/uniqa` only** — do **not** open PRs targeting `main` for UNIQA work.
5. After generation, run:

```bash
npx playwright test tests/ui/group-work/ --project=chromium
```

6. Update `docs/test-reports/` only if the team wants a combined steps 1–3 report later.
