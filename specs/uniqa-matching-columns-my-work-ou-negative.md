# UNIQA — Matching Alerts columns, My Work worklists, Admin OU, OU consistency, negative Search

## Application Overview

Cheap follow-up after steps 1–3 on `project/uniqa`:

| Done | Spec |
|---|---|
| Menu open smoke | `specs/uniqa-admin-menu-screens.md` |
| All Alerts dropdowns / OU apply | `specs/uniqa-group-work-all-alerts.md` |
| Group Work siblings + All Alerts core + **required** grid headers | `specs/uniqa-group-work-siblings-and-all-alerts-core.md` |

This plan adds five **non-destructive** slices that deepen EIM / org / analyst coverage without claim/assign/create or Admin master-data edit:

1. **Matching Alerts columns** — beyond the required six headers (order soft-check, optional columns, filter-row ↔ column pairing).
2. **My Work — analyst worklists** — chrome deeper than menu open smoke (list/grid + empty-or-rows; no Get Next / Create submit).
3. **Administration — Organizational Units (read-only)** — list/grid presence; no create/edit/delete.
4. **OU option consistency** — Admin OU names vs All Alerts OU `<select>` options (subset / overlap, not full sync).
5. **Negative Search** — broaden empty-result smoke beyond Alert ID (customer / case / nonsense OU).

**Seed:** `tests/seed.spec.ts`  
**Docs (context):** [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6),
[UNIQA-3 Interface Format Specification](https://netreveal.atlassian.net/browse/UNIQA-3)  
**Environment:** branch `project/uniqa` + UNIQA QA (`storageState`)

**Session model:**

- Use `storageState` from `tests/auth.setup.ts`.
- **Do not** re-login in scenarios.
- **Do not** open Change password.
- **Do not** navigate to Services Manager → Reload Configuration (or other Reload * actions).
- **Do not** claim / assign / close / create / hibernate alerts, cases, or tasks.
- **Do not** save Administration Organizational Unit changes (read-only asserts only).
- **Do not** click Get Next Alert as a business action (open-only remains under menu smoke if needed).

**Implementation conventions (for Generator):**

- Import `test` / `expect` from `tests/fixtures.ts`.
- Reuse `MainMenuPage`, `AllAlertsPage`, `GroupWorkSiblingPage`; add thin POMs where helpful
  (e.g. `OrganizationalUnitsPage`, `MyWorkListPage`).
- Prefer label / role; fall back to live ids discovered on UNIQA QA.
- Keep scenarios independent; one concern per test where practical.
- Commit on **`project/uniqa` only** — do **not** open PRs targeting `main` for UNIQA work.

**Suggested output paths:**

- `tests/ui/group-work/all-alerts-grid-columns.spec.ts`
- `tests/ui/my-work/my-work-worklists.spec.ts`
- `tests/ui/administration/organizational-units.spec.ts`
- `tests/ui/cross-cutting/ou-options-consistency.spec.ts`
- `tests/ui/group-work/all-alerts-negative-search.spec.ts`
- Optional POM: `src/ui/pages/OrganizationalUnitsPage.ts`, `src/ui/pages/MyWorkListPage.ts`

**Live anchors (known from prior snapshots):**

| Area | Id / leaf |
|---|---|
| All Alerts leaf | `menu-item_group_work_path_menu-item_all_alerts_path` |
| All Alerts search | `#EIM_AlertsSearch` |
| Matching Alerts table | `#EIM_AlertsSearchResults_interactiveListTable` |
| All Alerts OU select | `#EIM_AlertsSearch__ORGUNIT_ID` |
| Admin Organizational Units leaf | `home_administration_home_administration_authorisation_base_orgunitlist_caption` |

---

## Part A — Matching Alerts grid columns (deepen)

> Complements step-3 §C (required headers + filter-row presence).  
> Here: **column model depth** without row-action clicks.

### A.1 Required headers remain present (regression)

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Open **Group Work → All Alerts**.
2. Wait for `#EIM_AlertsSearchResults_interactiveListTable` (header row may be the second `thead tr`).
3. Assert required headers still match (same set as `ALL_ALERTS_REQUIRED_GRID_HEADERS`):

| Required (business) | Notes |
|---|---|
| Alert Identifier | aka Alert ID |
| Type/Sub-Type | |
| Priority | |
| Status | |
| Organization Unit | EIM / OU traceability |
| Assigned To | |

**Expected:** Required headers attached/visible; suite fails if any required column disappears.

### A.2 Optional columns — soft inventory

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. On the same Matching Alerts table, soft-check optional headers (annotate missing; do not fail):

| Optional | Notes |
|---|---|
| Description | |
| Age in days | |
| Main Customer | |
| Customer Segment | |
| Customer Previously Reported | view may hide |
| Case Name | |
| Main Employee Name | |
| Score | |
| Related Cases | |
| Other Details | |
| Due Date | |

2. Push `test.info().annotations` for each missing optional column.

**Expected:** Inventory of present vs hidden optional columns for UNIQA QA view config.

### A.3 Header order soft-check (required subset)

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Collect normalized header texts from the label header row.
2. Soft-assert that among **required** headers that are present, relative order is stable:

   `Alert Identifier` → `Type/Sub-Type` → … → `Assigned To` / `Organization Unit`  
   (exact indices may shift if optional columns are inserted; compare **relative** order of required names only).

3. If order differs, annotate (or fail only if product owners mark order as contract — default: **annotate**).

**Expected:** Documented relative order; no flake from optional column visibility.

### A.4 Filter-row control under a required column

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Assert filter-row chrome (`*filterCell*` / thead input|select) still present.
2. Assert at least one filter control exists under / associated with **Alert Identifier** or **Type/Sub-Type** (id pattern or column index).
3. Do **not** apply filters that mutate selection state beyond UI smoke.

**Expected:** Column filter UX still wired for at least one required column.

---

## Part B — My Work — analyst worklists

> Menu smoke already opens every My Work leaf.  
> Here: **worklist chrome** for analyst lists only — no Create submit, no Get Next claim.

### B.1 Worklist screens show list/grid chrome

**Seed:** `tests/seed.spec.ts`

**Screens (read-only worklists):**

| Screen | `leafId` |
|---|---|
| My Active Alerts | `menu-item_my_work_path_menu-item_my_alerts_path_menu-item_my_activealerts_path` |
| My Active Cases | `menu-item_my_work_path_menu-item_my_cases_path_menu-item_my_active_cases_path` |
| My Minor Groups | `menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_my_minor_groups_path` |

**Steps:**

1. Open each leaf via `MainMenuPage.openLeaf`.
2. Assert title/heading identifies the worklist.
3. Assert a results table/list is attached (empty data OK).
4. Assert login form is not shown.
5. Do **not** click Assign / Claim / Create / Get Next.

**Expected:** Each analyst worklist loads with list chrome; session intact.

### B.2 Task / notification lists — landmark only

**Seed:** `tests/seed.spec.ts`

**Screens:** My Tasks → Daily View; My Notifications → Inbox  
(extend to Weekly/Overdue/Sent/Deleted only if cheap)

**Steps:**

1. Open leaf; assert authenticated shell + primary content region (list, calendar, or empty-state text).
2. No task completion / mail send / delete.

**Expected:** Analyst inbox/task views open; structure only.

### B.3 Explicitly out of scope on My Work

- Create Alert / Create Case / Create Minor Group **submit**
- Get Next Alert as claim action
- Completing or reassigning tasks
- Sending / deleting notifications

---

## Part C — Administration — Organizational Units (read-only)

### C.1 Organizational Units list opens

**Seed:** `tests/seed.spec.ts`

**Leaf:** `home_administration_home_administration_authorisation_base_orgunitlist_caption`  
**Link:** Organizational Units

**Steps:**

1. Open via main menu.
2. Assert page title / heading relates to Organizational Units (or org unit list).
3. Assert a table/list of units is attached (or empty-state chrome).
4. Assert no login form.

**Expected:** Admin OU screen loads read-only; session intact.

### C.2 List has identity columns / rows chrome

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. On Organizational Units, assert at least one header cell or row identity (Name / Code / Id — discover live labels).
2. If rows exist, assert ≥1 data row **or** explicit empty message.
3. Do **not** open edit dialogs; do **not** click New / Save / Delete.

**Expected:** Master-data list is inspectable without mutation.

### C.3 Out of scope

- Create / edit / delete OU
- Hierarchy drag-drop
- Permission binding changes

---

## Part D — OU option consistency

> Goal: analyst filter OU options are not wildly divorced from Admin OU master list.  
> Not a full bidirectional sync proof.

### D.1 Collect Admin OU display names (read-only)

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Open Administration → Organizational Units.
2. Collect visible OU **names** (or codes) from the list (cap sample size, e.g. first 20 unique strings).
3. Store in test memory only (no fixtures file required unless Generator prefers).

**Expected:** Non-empty sample when QA has OU data; if empty, annotate and soft-skip D.2.

### D.2 All Alerts OU select overlaps Admin sample

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Open All Alerts; expand Supplementary Attributes.
2. Read `#EIM_AlertsSearch__ORGUNIT_ID` option texts (skip blank placeholder).
3. Assert **overlap**: at least one Admin-sampled name/code appears in the select options  
   **or** (if naming differs) at least N options exist on both sides and annotate mismatch for humans.
4. Do not require exact set equality (views / security may filter).

**Expected:** Evidence of shared org dimension; clear annotation when overlap is zero.

### D.3 Sibling OU (optional smoke)

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. If All Cases / All Minor Groups expose OU selects, assert option count ≥1 after expand.
2. Soft-compare option count magnitude to All Alerts (annotate large gaps; do not fail on count inequality).

**Expected:** Org filters elsewhere remain populated.

---

## Part E — Negative Search

> Step-3 B.2 covers Alert ID `NO-SUCH-ALERT-999999`.  
> Here: more empty-result paths without destructive actions.

### E.1 Negative Alert ID (regression)

**Seed:** `tests/seed.spec.ts`

**Steps:** Same as step-3 B.2 — nonsense Alert ID → Search → shell usable → Clear.

**Expected:** Empty Matching Alerts OK; no session loss.

### E.2 Negative Main Customer Name

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Expand Linked To / Core as needed.
2. Fill Main Customer Name with `NO-SUCH-CUSTOMER-ZZZ`.
3. Search; assert still on All Alerts; results region attached (empty OK).
4. Clear; assert field empty.

**Expected:** Same resilience as Alert ID path.

### E.3 Negative Case Identifier (optional)

**Seed:** `tests/seed.spec.ts`

**Steps:**

1. Enter nonsense Case Identifier; Search; assert shell + results chrome.
2. Clear.

**Expected:** Empty result success; skip if field absent in view.

### E.4 Out of scope

- SQL/injection strings as security tests
- Bulk export after empty search
- Performance SLAs

---

## Out of scope (global)

- Claim / assign / close / hibernate / create alert or case
- UNIQA-6 state-machine walks on alert detail
- UNIQA-3 payload / API contracts
- Admin OU write paths
- Services / C&C Reload Configuration
- Export downloads, email notify, destructive toolbar actions

---

## Traceability

| Scenario | Suggested spec | Angle | Cost |
|---|---|---|---|
| A.1–A.4 Matching columns depth | `all-alerts-grid-columns.spec.ts` | EIM list model | low |
| B.1–B.2 My Work worklists | `my-work-worklists.spec.ts` | analyst inbox/lists | low |
| C.1–C.2 Admin OU read-only | `organizational-units.spec.ts` | org master list | low |
| D.1–D.3 OU consistency | `ou-options-consistency.spec.ts` | org dimension glue | medium |
| E.1–E.3 Negative Search | `all-alerts-negative-search.spec.ts` | empty-result resilience | low |

**Depends on (already implemented):**

- Menu navigation / `MainMenuPage` / `menuInventory.ts`
- `AllAlertsPage` (filters, core, required headers)
- `GroupWorkSiblingPage` (sibling OU when present)
- Menu smoke for My Work + Administration Organizational Units (open-only)

---

## Generator notes

1. Re-snapshot Matching Alerts headers and Admin OU list DOM on UNIQA before locking selectors.
2. Extend `AllAlertsPage` for column-order helper and extra negative-search helpers; add `OrganizationalUnitsPage` for read-only list scrape.
3. Keep `@plan` / `@seed` headers pointing to this document.
4. Commit on **`project/uniqa` only**.
5. After generation, run:

```bash
npx playwright test tests/ui/group-work/all-alerts-grid-columns.spec.ts \
  tests/ui/group-work/all-alerts-negative-search.spec.ts \
  tests/ui/my-work/my-work-worklists.spec.ts \
  tests/ui/administration/organizational-units.spec.ts \
  tests/ui/cross-cutting/ou-options-consistency.spec.ts \
  --project=chromium
```

6. Update `docs/test-reports/` only if the team wants a combined steps 1–4 report later.
