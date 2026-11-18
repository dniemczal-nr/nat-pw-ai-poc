---
name: nat-framework
description: Operating the NAT NetReveal test framework (Playwright + TypeScript; projects setup / chromium / api / batch / ssh / ends-session; NAT dashboard) on main or any customer project branch. Use it whenever the user asks to run tests or "the full pack" on an environment, summarise or explain a run or report, triage or heal failing specs, probe the environment's DB / REST / MinIO, write or extend a spec or plan in specs/, recreate test customers, or check whether a Jira ticket is covered by the test set — even if they only say "run the tests", "what's failing", "is it in the report" or just name a ticket.
---

# NAT framework

Universal NetReveal test core: one repo shape, many customer projects (config overlays on
`project/<name>` branches). `CLAUDE.md` holds the hard rules and `docs/architecture.md` the design;
this skill is the operating manual on top of them. Do not restate CLAUDE.md to the user — follow it.

## First: where am I?

1. `git branch --show-current`. On `project/<name>`, read `references/project-<name>.md` if it
   exists: it has the environment, data sources, people and known findings for that customer.
   On `main` there is no customer data — keep everything customer-agnostic. A project adds its own
   `references/project-<name>.md` on its branch only (see the end of `references/writing-specs.md`).
2. `npm run -s config:print` when anything looks unset or a test reaches an unresolved `${…}`.
   It also says which env file was loaded (`ENV_FILE` → `.env` → single `<name>.env`).

## Pick the workflow

| User wants | Read |
|---|---|
| run tests / a pack, then a summary or report | `references/run-and-report.md` |
| why something fails, fix it, or a run looked odd | `references/triage-and-heal.md` |
| a new or changed spec, plan, page object, fixture; ticket coverage | `references/writing-specs.md` |
| a quick look at environment data (DB row, REST response, MinIO object) | "Probes" in `references/triage-and-heal.md` |

## Things that bite (why they matter)

- **Shared environments.** Every REST send and batch envelope writes to a shared QA used by other
  people. Key everything with `NAT…` / `${RUN_ID}`, write only to NAT-created customers, and say in
  your reply what you wrote. Each batch run uses up the next envelope date for good — mention it
  before running, and name the date used afterwards.
- **One UI session.** NetReveal ends every session of a user on login/logout and keeps the open
  entity in the session. That is why UI projects run on one worker and `@ends-session` specs run
  last in the `ends-session` teardown project. Never "fix" flakiness by adding UI workers.
- **Read-only DB.** `AdminerDbClient` runs one SELECT per call; big `apps.customer*` scans time out —
  filter by the `NAT…` key.
- **Temporary probe specs** (`tests/api/zz-probe.spec.ts`, `tests/batch/zz-probe.spec.ts`) are a
  tool, not a deliverable: delete them in the same command that runs them, and check
  `git status` afterwards.
- **Healing** fixes locators and page objects, not assertions. If the app is wrong, the test stays
  and gets `test.fixme(true, '<ticket/finding>: <actual behaviour>')`. Expected values come from
  test data files, never from what the environment happens to return.
- **Git.** Core changes reach `main` only through a PR from a worktree; customer data never goes
  to `main`. Commit only what you changed (not `.DS_Store`), and let the user push.

## Reporting back

Lead with the outcome (passed / failed / skipped per project), then each failure with its cause
and the customers involved, then what you changed or propose and what still needs the user's
go-ahead (anything that writes to the environment, pushes or opens a PR). Keep known `fixme`s as
one line, not a list, unless asked. Text meant for a ticket or a customer contact is written for
that reader: self-contained, with the values compared, where they come from, and customer IDs.
