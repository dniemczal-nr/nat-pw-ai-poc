# Plan — NetReveal front-end performance

Source: SSSMP1VUIO-3176 "Front End Performance Test – R2.06.1" (parent SSSMP1VUIO-3164) and
SSSMP1VUIO-2969 (All Alerts slowness). Seed: `tests/seed.spec.ts`. Project: `perf`.

## Measurement model

- **Screen time** = user initiates an action (click) → the resulting screen is ready for use:
  1. the old document or rows are gone (stale marker set just before the click),
  2. the screen's key element is visible,
  3. no NR busy indicator is visible (DataTables `Processing...`, `div.processing`, `#load`).
- Hover-menu navigation, typing and think time are **not** timed.
- Each measurement also records the slowest document/XHR time-to-first-byte in the window
  (`serverMs`, `slowestRequest`). That points a slow screen to the request, and from there to the DB query.
- In the baseline, leading `perf.warmupIterations` are recorded but excluded from statistics.
  The concurrent workload has no warm-up or repeated iterations. Reported: p50/p90/p95/max per screen.
- Concurrent workload = one isolated headless browser context per distinct `perf.users` login in **one** browser process,
  each logged in to its own NR session. It needs no extra browsers and no Selenium Grid sessions.
  One machine carries roughly free RAM ÷ `perf.load.memoryPerUserMb` users; for more (e.g. 100), run
  the load spec on several machines at the same time and combine the results with `npm run perf:merge`.
- Every action is a Gherkin-style step in NAT wording (`When I open menu item: "…"`). It is logged as one
  console line per virtual user (`perf.printSteps`) and shown as a step tree in the HTML report, with a nested
  `Then the screen is ready for use — <ms>` result.
- Every load user must log in, complete at least one action from its own menu and log out; a user that
  starts the All Alerts search must complete it (search, alert, Back).
  The baseline user (`perf.baselineUser`) must see every configured baseline screen.

## Baseline screens (`perf.screens`; not used by the load scenario)

- `auto` (SNB default): after login each virtual user reads its own menu from `nav#mainMenu`
  (the full tree is in the DOM right after login) and opens **every** screen in it, by clicking through
  the menu (links carry a per-session `secure=` token, so URLs are never replayed). Each role therefore
  opens its own set; `menus.json` lists per login what was opened and what was left out, and why.
- Never opened, whatever the config: labels/links with Reload, ReCalculate or Get Next (global actions such as
  Services Manager → Reload Configuration, or alert assignment), links without `href`, links to a new window.
  `perf.menu.exclude` (default `Import|Export|Merge`) and `perf.menu.include` narrow the set further.
- A list of `A->B->C` paths opens exactly those screens instead.
- Screens that are a separate app without the NR menu (Scenario Manager `smc.do`) are timed too; the next
  step first goes Back (untimed) to a page with the menu.

## Screen catalogue (ids used in reports, thresholds, baselines)

| Id | Action → ready |
|---|---|
| `LOGIN` | Open login page → submit login → Home header (retries in baseline only) |
| `LOGOUT` | Open user menu → click logout → login form visible (load scenario) |
| `MENU <A > B>` | Click menu leaf (`perf.screens`) → new screen `h1` / `#content` / `#screenId` |
| `MENU Group Work > All Alerts` | Click menu leaf → Search button |
| `ALL_ALERTS_VIEW <view>` | Choose result view (`perf.allAlerts.view`) → view label switched |
| `ALL_ALERTS_SEARCH` | Click Search → result table redrawn |
| `ALERT_DETAILS_OPEN` | Click the first unlocked alert id → Key Actions (baseline distributes starting rows) |
| `ALERT_DETAILS_BACK` | Click Back → All Alerts |
| `DB <file>` | JDBC execute → first `perf.db.maxRows` rows |

## §1 Screen response-time baseline (`tests/perf/screen-timings.spec.ts`, `@perf-screens`)

Baseline login makes up to **5 attempts**, stopping on success. Each attempt shares a **30 s budget**
across opening the environment, filling/submitting the form and waiting for Home, with no backoff.
Each retry opens the login URL again; failed attempts are shown in the step log. A recovered login
produces one successful LOGIN measurement including total elapsed recovery time; exhausting the attempts
records a failed LOGIN and fails the run. Other screen timeouts and whole-test retries are unchanged.

**Scenario: key screens are timed from user action to ready for a single user**
1. `perf.baselineUser` logs in (timed `LOGIN`).
2. For `warmup + iterations` loops: open every `perf.screens` menu screen, then run the All Alerts flow
   (open → optional view switch → Search → open alert → Back).
3. Log out.

Expect: every screen becomes ready within `perf.readyTimeoutMs` (no errors). A p90 above `perf.thresholds`
is an annotation, or a failure when `perf.enforceThresholds=true`.

## §2 Concurrent NAT workload (`tests/perf/concurrent-workload.spec.ts`, `@perf-load`)

Agreed 05 November 2026 (retain Playwright), refined afterwards: users log in at random moments, perform
a random mix of actions from their own menu (everyone with All Alerts also runs the search), stay logged in for about two
minutes and then log out independently — to assess the end-user impact of the Alahali Mobile channel.

**Scenario: virtual users run the NetReveal journey concurrently**
1. With `perf.db.captureTopSql=true`, snapshot `v$sql`.
2. Supply one distinct provisioned account per virtual user in `perf.users` (e.g. 5, 100, 290 or 1000
   for the agreed SAI run). The user count is the number of
   distinct entries, not `perf.virtualUsers`; the runner rejects duplicate resolved accounts
   (including the `admin` alias and case-only differences). Shards use the same ordered list and disjoint assignments.
3. Schedule logins across the full **120 seconds** (`perf.load.loginWindowMs=120000`): the slots are
   shuffled between users, and each user gets a random moment inside its slot, so the order is random
   but the whole window is used. Do not add `perf.rampUpMs` or `perf.arrivalWindowMs`.
   Attempt each login once; neither failures nor session recovery trigger another login.
4. Each user reads its own menu (`nav#mainMenu`; roles differ) and performs a random number of actions
   between `perf.load.actionsMin` (5) and `perf.load.actionsMax` (10), with think time between them:
   - Menu screens are drawn at random from the user's menu (no repeats until the menu is exhausted,
     never the same screen twice in a row); `perf.menu.exclude` / global actions are never opened.
   - **Every user who can see All Alerts** (`perf.allAlerts.menuPath` in its menu) runs the All Alerts
     search exactly once, at a random position among its actions: open `perf.allAlerts.menuPath`,
     optionally select the configured view, fill Date From with **one calendar month before today**
     (`dd/MM/yyyy`, month ends clamped; overrides a configured Date From), Search, click the **first
     unlocked alert**, wait for Key Actions, click Back and wait for All Alerts.
5. After its actions each user stays logged in for a random
   `perf.load.idleBeforeLogoutMinMs`–`perf.load.idleBeforeLogoutMaxMs` (90–150 s), then logs out on its
   own (timed through login-form visibility). Users do not wait for each other.
6. Record the run window (`window.json`) through the last logout for the custom DB report
   (StatsPack is unavailable on AWS PERF). Snapshot `v$sql` again if enabled and report top statements.

The load scenario ignores `perf.screens`, menu sampling, iteration/warmup and role-skip settings;
think-time settings still apply between actions. Baseline behaviour is unchanged.
Loads above `perf.load.maxUsersElsewhere` run only where `application.environment` is in
`perf.load.allowedEnvironments`; shared environments remain protected. Perf specs have no automatic
retry and run with one worker per process so baseline and load cannot log in concurrently.

Expect: every account has successful LOGIN, at least one successful action and LOGOUT; every account
with All Alerts in its menu also has successful All Alerts open, SEARCH, ALERT_DETAILS_OPEN and ALERT_DETAILS_BACK.
Error-rate and p90 threshold checks also apply. Empty results, no unlocked alert, a lock race,
missing permissions and application error pages fail coverage. There is no alert retry loop:
the first unlocked row is deliberately not distributed by user, as agreed. Back releases its lock.

For several processes on one host, `perf:bombard` supplies the start barrier automatically.
For several machines, start `npm run perf:coordinator -- --shards=4` and set its URL as
`PERF_COORDINATOR` on every machine with `PERF_SHARD=1/4` ... `4/4` (or agree a common `PERF_START_AT`),
so the 120-second login window starts at the same moment everywhere. A missing shard times out the
start barrier and fails the run. Use a fresh coordinator per run.

Offline regression checks (no browser or customer environment):
`npx tsx --test tests/unit/perf-catalogue.test.ts`.

## §3 Screen SQL execution time (`tests/perf/db-query-timings.spec.ts`, `@perf-db`)

**Scenario: query `<file>` returns its first page within perf.db.maxQueryMs**
For every file in `perf.db.timedQueries`: run `perf.db.queryIterations` times (first = warm-up), fetching
`perf.db.maxRows` rows. Expect the fastest run ≤ `perf.db.maxQueryMs`.
SNB: `projects/snb/sql/wlm-alerts-list-top120.sql` (SSSMP1VUIO-2969, target < 1 s).

## Comparison between releases

`reports/perf/<runId>/summary.json` per run. `perf.baselineFile` or `npm run perf:compare` compares p90 per
screen and flags a change above `perf.regressionThresholdPct` as REGRESSION or IMPROVED.
Compare before/after integration on the same environment, dataset, account list and load schedule.

## Sharing with the TC team

The **Perf run** GitHub Actions workflow writes the per-action timing table into the run's Summary
(merged across processes for `bombard`) and adds a **Download performance reports** artifact link.
Provide TC members with repository read access and share the workflow-run URL internally.
The artifact contains raw CSV/JSON, Markdown summaries and the Playwright HTML report with steps.
Download and extract it, then use `npx playwright show-report <extracted-report-directory>` for HTML.
Artifacts expire after 14 days; retain approved baseline/result packages in the team's access-controlled
document store. Do not publish reports publicly: they may contain usernames, screenshots and SQL text.
This change provides the sharing mechanism; repository access and actual test accounts must be provisioned.

## Out of scope / follow-ups

- Workflow (write) journeys, e.g. New → Release from NAT SSSMP1VUIO-2820. They consume `New` alerts and need a
  dedicated data pool.
- Role-specific journeys (supervisor vs investigator screens).
- Pushing `summary.json` to the Performance dashboard (format to be agreed).
- Protocol-level traffic generation; the agreed multi-user UI journey stays in Playwright and can be sharded.
