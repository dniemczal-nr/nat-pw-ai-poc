# UNIQA NetReveal Admin — Menu Screens Test Plan

## Application Overview

Smoke / presence plan for **NetReveal Admin (UNIQA QA, NR ~9.6)** screens reachable from the
main application menu after login.

**Seed:** `tests/seed.spec.ts`  
**Environment:** branch `project/uniqa` + local `.env` / `config/local.properties`  
**Docs (context):** [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6),
[UNIQA-3 Interface Format Specification](https://netreveal.atlassian.net/browse/UNIQA-3)

**Session model:**
- Use `storageState` from `tests/auth.setup.ts` (`.auth/user.json`).
- **Do not** re-login in these scenarios.
- **Do not** open or exercise **Change password**.
- **Skip / never navigate to:** `Services Manager` → **Reload Configuration**
  (known hang / app freeze on this environment).
- Also **avoid clicking** other destructive **Reload Configuration / Reload Workflows /
  Reload Applications** items during this smoke plan unless a dedicated safe suite exists.

**Implementation conventions (for Generator):**
- Import `test` / `expect` from `tests/fixtures.ts`.
- Prefer POM + capabilities; put new locators in `src/ui/pages/*.ts`
  (e.g. `MainMenuPage`, screen page objects).
- Prefer role / label / `data-testid` when available; otherwise stable menu ids such as
  `#menu-item_group_work_path`, `#menu-item_*_path`.
- Each scenario: open menu path → assert target screen chrome (title / landmark / primary grid or form) → no console-level auth redirect to login.
- Keep scenarios independent where possible; one screen (or small group) per test.

**Suggested output paths:**
- `tests/ui/menu/my-work-screens.spec.ts`
- `tests/ui/menu/group-work-screens.spec.ts`
- `tests/ui/menu/back-office-screens.spec.ts`
- `tests/ui/menu/dashboards-screens.spec.ts`
- `tests/ui/menu/administration-screens.spec.ts`
- `tests/ui/menu/builders-and-managers-screens.spec.ts`

**Menu inventory source:** live DOM on UNIQA QA (`li.menu-item` / `#menu-item_*_path`), captured during planning.

---

## Top-level menu map (UNIQA QA)

| Top-level | Leaf screens / sub-items to cover |
|---|---|
| **My Work** | Home; My Active Alerts; Create Alert; Get Next Alert; My Active Cases; Create Case; My Minor Groups; Create Minor Group; My Tasks (Daily / Weekly / Overdue); My Delegated Tasks (Daily / Weekly / Overdue); My Notifications (Inbox / Sent Items / Deleted Items) |
| **Group Work** | All Alerts; Hibernated Alerts; Alerting Subjects; All Cases; All Minor Groups; All E-Files |
| **Back Office** | Subjects → Customers, Associated Parties, Counterparties; Policies |
| **Dashboards** | Customer Risk Dashboard; Alerts Dashboard; Cases Dashboard; ML Dashboard; Detection Dashboard |
| **Administration** | Authentication (Users, Create User, Groups, Create Group, Home Page Editor, LDAP Servers, User Trace Results); Authorisation (Roles, Permission Editor, Domains, Organizational Units); Auditing; Security; Session Management; Scheduler; Connectivity; Maintenance; System; Config Management (Menu Editor, Import/Export Configuration); Operations; Queuing and Routing (**skip Reload Configuration**); … |
| **Application Builder** | View All Applications; New Application; Wizards; Import Application; Application Parameters; Reload Applications (*defer/skip if unstable*); Search; Set up; Dashboard Manager; SQL Test Results; FTS Entity Configuration; Procedures; Application Triggers |
| **Workflow Configurator** | Workflows; Import/Export/Merge Workflows; Reload Workflows (*skip if unstable*); Consistency Checking Tools |
| **Scenario Manager** | Scenario Manager; Scenario Manager Lists; System Log; Bulk Operations |
| **Scenario Manager - CDD** | Risk Model Manager CDD; Import/Export Risk Model; Scenario Manager; Shared List Management; Refresh; Rescore Subjects |
| **Scenario Manager - CDD Automated Alert Triage** | Scenario Manager; Refresh |
| **Services Manager** | Services Configuration; Import Configuration; Export Configuration; **SKIP Reload Configuration**; Send Test Message; Error Log; Monitoring Configuration; Monitoring; Acquisition Progress |
| **Command And Control** | Configuration; Export/Import Configuration; **SKIP Reload Configuration**; Report Builder; Metric Jobs |
| **Compliance Simulation** | CDD Simulation → Risk Model Simulation |

---

## Test Scenarios

### 1. My Work screens open

**Seed:** `tests/seed.spec.ts`

#### 1.1 Navigate each My Work leaf screen

**Steps:**
1. Start from authenticated shell (`storageState`).
2. For each leaf under **My Work** (table above): open via main menu.
3. Assert the destination screen is shown (heading / primary content region / no login form).
4. Return to a stable home/shell state before the next leaf if the UI requires it.

**Expected Results:**
- Each listed My Work screen loads without session loss.
- Login page is not shown.
- Change password UI is never opened.

---

### 2. Group Work screens open

**Seed:** `tests/seed.spec.ts`

#### 2.1 Navigate each Group Work leaf screen

**Steps:**
1. From authenticated shell, open **Group Work**.
2. Open each of: All Alerts, Hibernated Alerts, Alerting Subjects, All Cases, All Minor Groups, All E-Files.
3. Assert each screen’s primary chrome is visible.

**Expected Results:**
- All six Group Work destinations open successfully.
- Detailed control inventory for **All Alerts** is covered in `specs/uniqa-group-work-all-alerts.md` (separate plan).

---

### 3. Back Office screens open

**Seed:** `tests/seed.spec.ts`

#### 3.1 Subjects and Policies

**Steps:**
1. Open **Back Office → Subjects → Customers / Associated Parties / Counterparties**.
2. Open **Back Office → Policies**.
3. Assert each screen loads.

**Expected Results:**
- All four destinations load while authenticated.

---

### 4. Dashboards open

**Seed:** `tests/seed.spec.ts`

#### 4.1 Each dashboard destination

**Steps:**
1. Open **Dashboards** and each dashboard leaf from the map.
2. Assert dashboard shell / title / main widget area is present (exact widgets can be refined later).

**Expected Results:**
- All five dashboards open without auth failure.

---

### 5. Administration screens open (read-only smoke)

**Seed:** `tests/seed.spec.ts`

#### 5.1 High-traffic Administration leaves

**Steps:**
1. From **Administration**, open representative screens including at least:
   - Users, Groups, Roles, Domains, **Organizational Units**
   - Audit Log Search
   - Menu Editor
2. Prefer read-only asserts (page visible). Do not save configuration changes.
3. Do **not** click Queuing and Routing → **Reload Configuration**.

**Expected Results:**
- Selected Administration screens open.
- No configuration reload side effects.

**Note:** Full Administration leaf matrix may be split across multiple specs; Generator should cover the inventory table progressively and mark risky reload actions as `test.skip`.

---

### 6. Builders / managers / simulation (safe leaves only)

**Seed:** `tests/seed.spec.ts`

#### 6.1 Open non-destructive leaves

**Steps:**
1. Open safe leaves under Application Builder, Workflow Configurator, Scenario Manager*, Services Manager, Command And Control, Compliance Simulation.
2. **Explicit skips:**
   - Services Manager → **Reload Configuration**
   - Command And Control → **Reload Configuration**
   - Workflow Configurator → **Reload Workflows** (treat as skip unless proven safe)
   - Application Builder → **Reload Applications** (skip unless proven safe)

**Expected Results:**
- Safe screens open.
- Skipped reload actions are documented in the spec with reason.

---

## Out of scope

- Change password / credential mutation
- Services Manager → Reload Configuration (hang)
- Deep functional assertions inside each screen (except All Alerts — see companion plan)
- Writing/saving admin configuration
- SSH / non-UI

## Traceability

| Area | Spec suggestion |
|---|---|
| My Work | `tests/ui/menu/my-work-screens.spec.ts` |
| Group Work | `tests/ui/menu/group-work-screens.spec.ts` |
| Back Office | `tests/ui/menu/back-office-screens.spec.ts` |
| Dashboards | `tests/ui/menu/dashboards-screens.spec.ts` |
| Administration | `tests/ui/menu/administration-screens.spec.ts` |
| Builders & managers | `tests/ui/menu/builders-and-managers-screens.spec.ts` |
| All Alerts details | `specs/uniqa-group-work-all-alerts.md` |
