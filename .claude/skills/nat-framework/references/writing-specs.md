# Write specs and plans; ticket coverage

## Flow: plan → spec → run

1. **Plan** in `specs/<area>.md`: one plan per feature area, numbered sections and scenarios,
   "Implementation status" table, findings table (F1, F2 …) for spec/environment disagreements,
   open questions, next steps. Keep it current when tests or answers change.
2. **Spec** in `tests/<project-dir>/…spec.ts`, opening with:
   ```ts
   /**
    * @plan specs/<plan>.md §3
    * @seed tests/seed.spec.ts
    */
   import { test, expect } from '../fixtures';
   ```
   One `test.describe` per top-level plan item; test titles = scenario names; order-independent.
3. `npm run lint` and `npx playwright test --list`, then run it on the environment.

## Where code goes

| What | Where |
|---|---|
| locators | `src/ui/pages/*.ts` (role / label / data-testid; no absolute XPath) |
| new page object | register as a fixture in `tests/fixtures.ts` |
| REST / DB / MinIO / SSH | `src/capabilities/*` via fixtures `rt`, `db`, `minio`, `ssh` |
| expected values | `test-data/<project>/*.json` with `source` and `note` fields; never literals in a spec |
| shared helpers for one area | a `*.ts` beside the specs (e.g. `tests/api/<project>Cdd.ts`) |
| config | `src/config` (`get`/`has`/`getOrDefault`), never `process.env` in a spec |

- Login/logout specs: `@ends-session` on the describe.
- Anything that writes: unique `NAT…`/`${RUN_ID}` keys, self-cleaning or restoring.
- Not yet testable: `test.fixme(true, '<why>')` with the blocker — the scenario stays visible.

## "Is ticket X covered? Can it move on in Jira?"

1. Find it: `grep -rn "<TICKET>" specs tests`. The plan's "Scope by ticket" and status tables map
   tickets to sections and files.
2. List the scenarios the plan gives the ticket, and the test that covers each.
3. Check the **latest** results for those tests (latest `.nat/runs/*/results.json`, or rerun the
   file if the run predates a data change).
4. Answer: covered / partly covered, with pass counts per spec, and what stays open (undecided
   behaviour, doc changes, known core issues) — those can be a comment rather than a blocker.
5. Jira writes go through the Atlassian connector only when it is connected and the user asked;
   otherwise hand over ready-to-paste text. Do not tag people unless asked.

## A project reference for this skill

On a customer branch, add `.claude/skills/nat-framework/references/project-<name>.md` (never on
`main`). Keep it to what an agent cannot read from the code: environment notes and what is safe
to write there, sources of truth for expected values and who decides when they disagree with the
environment, the scoring or business rules the specs rely on, plans ↔ spec files, known open
findings and their `fixme` switches, recurring chores (e.g. recreating test customers), people
and how to communicate with them. No URLs with credentials, no passwords or tokens.
