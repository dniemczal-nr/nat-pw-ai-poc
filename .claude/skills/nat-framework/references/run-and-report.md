# Run tests and report

## Choose the command

| Scope | Command |
|---|---|
| sanity, no browser, no env | `npx playwright test --list` and `npm run lint` |
| one file / grep | `npx playwright test --project=<p> tests/<path>.spec.ts` · `--grep "<title>"` |
| UI | `npm run test:ui` (setup → chromium → ends-session) |
| REST real-time | `npm run test:api` |
| batch (writes an envelope) | `npm run test:batch` (`BATCH_ENABLED=true`) |
| full pack | `--project=chromium --project=api --project=batch` (see below) |

Filtering by file or `--grep` keeps the `setup` dependency, so a single UI spec still logs in.
Teardown projects ignore filters: any CLI UI run ends with **all** `@ends-session` specs.

## Full pack with a report

Long (10–20 min, batch load alone ~6–10 min): run it in the background and wait for the
notification instead of polling.

```bash
S=<scratchpad>/run<MMDD><a|b|c>; mkdir -p $S
BATCH_ENABLED=true PLAYWRIGHT_JSON_OUTPUT_NAME=$S/results.json \
  npx playwright test --project=chromium --project=api --project=batch --reporter=line,json > $S/out.log 2>&1
echo EXIT $?
npm run -s nat:import -- $S/results.json      # → .nat/runs/<id>/ (summary.json, report.html)
node .claude/skills/nat-framework/scripts/summarize-run.cjs   # totals, per project, failures
```

- Leave out `BATCH_ENABLED=true` / `--project=batch` when the user does not want to use up an
  envelope date; say which you chose. Get the date used from the `envelope` annotation:
  `grep -o "envelope_[0-9]*\.zip" $S/results.json | sort -u`.
- Exit code 1 only means something failed; the summary says what.
- An imported CLI run has `report.html` (charts) but **no native Playwright HTML report**. That is
  produced only for runs started from the dashboard Runner (`npm run nat`, http://127.0.0.1:4747).
  If the user needs the native report, offer a dashboard run.
- A rerun of a subset is a separate dashboard run; runs are never merged. If the user needs one
  clean report after a fix, run the whole pack again (and say what that costs).
- `npm run nat:import -- --rerender` rebuilds every run's summary and report with the current code
  (e.g. after a dashboard change).

## Report to the user

1. Totals and pass rate, duration, and a small per-project table.
2. Each failure: test, cause in one sentence (from error + screenshot / `error-context.md`), the
   test data it used, and whether it is new, known or environmental.
3. Skipped = known `fixme`s, one line.
4. Where the report is: run ID and `.nat/runs/<id>/report.html`.
5. What you propose next; anything that writes to the environment waits for a "yes".
