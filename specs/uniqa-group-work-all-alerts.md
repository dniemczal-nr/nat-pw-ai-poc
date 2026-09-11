# UNIQA — Group Work → All Alerts (page elements) Test Plan

## Application Overview

Plan for **Group Work → All Alerts** on NetReveal Admin (UNIQA QA).
Focus: **presence and operability of page controls**, especially **dropdown / select filters**
such as **Organization Unit** (and related filter dropdowns), not end-to-end alert triage yet.

**Seed:** `tests/seed.spec.ts`  
**Parent menu plan:** `specs/uniqa-admin-menu-screens.md`  
**Docs (context):** [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6),
[UNIQA-3 Interface Format Specification](https://netreveal.atlassian.net/browse/UNIQA-3)

**Session model:**
- Authenticated via `storageState` (`tests/auth.setup.ts`).
- **No re-login** in these scenarios.
- **No Change password**.
- Do not navigate to Services Manager → Reload Configuration.

**Implementation conventions (for Generator):**
- Import `test` / `expect` from `tests/fixtures.ts`.
- Add POM e.g. `src/ui/pages/AllAlertsPage.ts` (+ reuse `MainMenuPage` for navigation).
- Navigate: main menu **Group Work** → **All Alerts**
  (menu id pattern observed: `#menu-item_group_work_path` … `all_alerts`).
- Prefer role / label / accessible name for filters (`getByLabel('Organization Unit')`, etc.).
- Discover live control names on UNIQA during generation — labels below are the expected
  business set; adjust POM to actual captions if wording differs slightly (Unit vs Organisation).

**Suggested output paths:**
- `tests/ui/group-work/all-alerts-filters.spec.ts`
- `tests/ui/group-work/all-alerts-grid.spec.ts`

---

## Screen entry

### Preconditions
- Admin session from `storageState`.
- User can access **Group Work → All Alerts** (UNIQA role permissions).

### Entry steps
1. Open authenticated application shell.
2. Open menu **Group Work**.
3. Choose **All Alerts**.
4. Wait for All Alerts view to finish loading (filter bar and/or results grid visible).

**Expected:** All Alerts screen is shown; login form is not shown.

---

## Test Scenarios

### 1. All Alerts shell chrome

**Seed:** `tests/seed.spec.ts`

#### 1.1 Primary regions are visible

**Steps:**
1. Enter All Alerts as above.
2. Assert page/section identity for All Alerts (heading, breadcrumb, or equivalent landmark).
3. Assert filter / search area is visible.
4. Assert results area (grid/table or list) is visible — may be empty, but structure present.

**Expected Results:**
- Filter region and results region are present.
- No navigation to login or change-password.

---

### 2. Dropdown / select filters (priority)

**Seed:** `tests/seed.spec.ts`

> Generator must snapshot the live filter bar and map these business filters to real controls.
> **Organization Unit** is mandatory. Other dropdowns should be covered when present in UNIQA build.

#### 2.1 Organization Unit dropdown is available

**Steps:**
1. On All Alerts, locate the **Organization Unit** filter (label may appear as Organization Unit /
   Organisational Unit / Org Unit).
2. Assert the control is visible and enabled.
3. Open the dropdown / select.
4. Assert the options list is shown (at least the empty/default option and/or one selectable value).
5. Close the dropdown without requiring a specific data-dependent selection (or select a safe known OU if seeded).

**Expected Results:**
- Organization Unit filter is present and openable.
- Options panel/list renders.
- Page remains on All Alerts.

#### 2.2 Other filter dropdowns are available

**Steps:**
1. For each additional dropdown/select visible in the All Alerts filter bar, assert visibility.
2. Typical NetReveal All Alerts filter candidates to verify **if present** (discover live):
   - Status
   - Priority / Severity
   - Alert type / Category
   - Assignee / Owner / Queue
   - Workflow state
   - Date range presets (if implemented as select)
3. Open each dropdown once and assert options UI appears; then dismiss.

**Expected Results:**
- Every discovered filter dropdown can be opened.
- Missing optional filters: document in spec comments; do not fail hard unless product requires them per UNIQA-6.

#### 2.3 Organization Unit participates in filter UX

**Steps:**
1. Open Organization Unit and note option count.
2. Apply a selection (first non-empty option) **or** clear/reset if apply is irreversible in lab data.
3. Trigger Search / Apply if required by UI.
4. Assert results region refreshes (grid still present; row count may change).
5. Reset filters to default if UI provides Clear/Reset.

**Expected Results:**
- Applying Organization Unit does not error or log the user out.
- Results region remains usable.
- Prefer non-destructive filter usage (no alert ownership changes).

---

### 3. Supporting page elements

**Seed:** `tests/seed.spec.ts`

#### 3.1 Actions and grid chrome

**Steps:**
1. Assert common actions if present: Search, Clear/Reset, Refresh, Export (presence only).
2. Assert results grid headers are visible when the table is rendered.
3. Assert empty-state message **or** at least one data row — either is acceptable for smoke.

**Expected Results:**
- Action controls that exist are visible.
- Grid/list chrome is present.
- No claim on specific alert business data beyond structural presence.

---

## Out of scope

- Claiming / assigning / closing alerts
- Creating alerts
- Change password
- Services Manager Reload Configuration
- Interface payload validation (UNIQA-3) — separate API suite later
- Full EIM workflow paths from UNIQA-6 beyond All Alerts filter presence

## Traceability

| Scenario | Suggested spec | Focus |
|---|---|---|
| 1.1 Shell chrome | `all-alerts-filters.spec.ts` | page regions |
| 2.1 Organization Unit | `all-alerts-filters.spec.ts` | dropdown |
| 2.2 Other dropdowns | `all-alerts-filters.spec.ts` | dropdown matrix |
| 2.3 Apply OU filter | `all-alerts-filters.spec.ts` | light interaction |
| 3.1 Actions / grid | `all-alerts-grid.spec.ts` | presence |

## Generator notes

- Re-discover filter labels on UNIQA during generation; update POM accordingly.
- If Organization Unit is inside a custom combo (not native `<select>`), use role/listbox patterns.
- Cross-check field naming against UNIQA-6 / UNIQA-3 when asserting business synonyms, but keep oracles UI-visible.
