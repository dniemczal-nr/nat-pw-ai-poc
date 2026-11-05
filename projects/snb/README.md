# SNB — front-end performance (SSSMP1VUIO-3176)

Project branch `project/snb`. Plan: [`specs/perf-front-end.md`](../../specs/perf-front-end.md).

## Setup

```powershell
npm ci; npx playwright install chromium
Copy-Item config\projects\snb.example.properties config\local.properties   # perf.* tuning only
```

Environments are aliases: `config/environments/<alias>.env` (gitignored; template `example.env`).
Each holds the UI URL, batch host, DB connection and passwords of one environment
(source: Confluence "Environments Details V9"). Pick one per command:

```powershell
npm run nr -- qa1                        # print resolved config for qa1
npm run nr -- perf test:perf:screens     # run an npm script against perf
$env:NR_ENV = "dev1"; npm run test:perf  # or set it for the whole PowerShell session
```

Aliases: dev1, dev2, qa1, qa2, qa4, inst1, proddev, prodqa, perf, perf2. `NR_ENV` wins over `ENV_FILE`
and the root `.env`. For DB tests, set `DB_PASSWORD` in the alias file.

## Runs

| What | Command | Ticket scope |
|---|---|---|
| Screen baseline, 1 user | `npm run nr -- perf test:perf:screens` | Screen timing (future iteration) |
| Concurrent workload + top SQL | `npm run nr -- perf test:perf:load` | First pass DoD |
| All Alerts SQL (2969) | `npm run nr -- perf test:perf:db` | First pass DoD (note) |
| Everything | `npm run nr -- perf test:perf` | |
| Compare releases | `npm run perf:compare -- <old>/summary.json <new>/summary.json` | Comparison between releases |

### Agreed journey (05 November 2026)

Each user logs in once at a random moment within the full 120 seconds (`perf.load.loginWindowMs`),
then performs a random 5–10 actions (`perf.load.actionsMin` / `actionsMax`) drawn from its own menu.
Every user who has All Alerts in its menu also runs the All Alerts search once, at a random
point: Date From one calendar month before today, Search, first unlocked alert, Back.
Afterwards each user stays logged in for a random 90–150 s (`perf.load.idleBeforeLogoutMinMs` /
`idleBeforeLogoutMaxMs`) and logs out independently. Every action, including logout, is timed.
Baseline iterations and old arrival/ramp settings do not affect this load journey.

### Concurrent users

Set `perf.users` to as many **distinct provisioned logins** as the run needs (5, 100, 290, 1000...).
The scenario runs one session per distinct login; `perf.virtualUsers` does not add users.
`npm run perf:config` prints the resulting count.
Loads above 5 users run only on `perf` / `perf2`; on qa/dev aliases the load test is skipped.
One machine needs roughly 150 MB free RAM per user. Where that is not available, start the
same ordered list with disjoint `PERF_SHARD` assignments on several machines (e.g. `1/4` through `4/4`).
Start `npm run perf:coordinator -- --shards=4` and set its URL as `PERF_COORDINATOR` on all machines
(or agree a common `PERF_START_AT`) so the login window starts together. Use a fresh coordinator for each run.
For several processes on a single machine, `npm run perf:bombard -- perf --shards=4` handles this automatically.
After a multi-machine run, merge:

```powershell
npm run perf:merge -- reports/perf/<runA> reports/perf/<runB> reports/perf/<runC> reports/perf/<runD> --out=reports/perf/R2.06.1_load_100vu
```

Each run prints one Gherkin line per step and virtual user (`perf.printSteps=false` silences it);
the HTML report (`npx playwright show-report`) has the same steps as a tree.

Results: `reports/perf/<runId>/` — `measurements.csv`, `summary.json`, `summary.md`,
`top-sql.csv` (v$sql delta of the run), `window.json` (exact run window for the custom DB report).
Set `PERF_RUN_ID` to name the folder. Do not pass `--reporter` on the command line: that replaces
the configured perf reporter.

Keep an agreed baseline as `perf/baselines/<release>/summary.json` and point `perf.baselineFile` at it.

### Sharing results with TC

Run the **Perf run** GitHub Actions workflow (`bombard` for several processes, `load` for one).
Supply the account list (one distinct login per user) via `perf_users`; keep the default 120-second windows.
The workflow Summary shows per-action p50/p90/p95/max and a **Download performance reports** link;
`bombard` shows a merged table. Share the run URL with TC members who have repository read access.
Artifacts include raw measurements and the Playwright HTML report, retained for 14 days.
Archive approved results in an internal access-controlled team store before expiry.
Reports can contain account names, screenshots and SQL text: do not publish them publicly.

## Before running on PERF

- PERF is switched off to save costs — agree the slot with Yaro first.
- Concurrency = one browser context per distinct `perf.users` login in one Chromium, **not** Selenium Grid
  sessions, so the 4-session Grid limit does not apply. Size the agent for ~150–300 MB RAM per user.
- Use one distinct login per virtual user (`perf.users`); NR may end an earlier session of the same user.
- The journey is read-only except for the alert lock taken by opening an alert (released by Back).
  Every user takes the first currently unlocked row; races are visible failures, not silently retried.
- Random actions open arbitrary screens from each user's menu: keep `perf.menu.exclude` covering anything
  that writes or disturbs others (Import/Export/Merge); global Reload/ReCalculate/Get Next are always skipped.
- Each user must log in, complete at least one action and log out; a started All Alerts search must
  complete including Back. No locked-alert retry loop is used;
  missing access, empty results or a lock race are reported as unmet coverage. Perf tests have no CI retry.
- `perf.db.captureTopSql` needs SELECT on `V_$SQL` for `DbUsername`. `top-sql.csv` holds SQL text
  that may contain literal customer values — keep it inside the project and attach it only to internal tickets.
- `db-query-timings` is expected to **fail** until SSSMP1VUIO-2969 is fixed (target < 1 s).

## First run on PERF — verify

The page objects were migrated from NAT selectors and checked only against a local mock of the
NR markup. On the first real run, confirm:

1. Menu screens replace the document and show an `h1` title (the ready check for `MENU …`).
2. All Alerts Search redraws `table[id*="interactiveListTable"]` (the ready check for `ALL_ALERTS_SEARCH`).
3. An alert opens in the same tab and shows `a[id*="KeyAction"]`.

If a check does not hold, fix the page object (`src/ui/pages/*`) and leave the assertions unchanged.
