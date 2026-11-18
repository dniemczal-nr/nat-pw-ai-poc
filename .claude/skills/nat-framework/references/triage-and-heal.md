# Triage and heal

## Evidence, in this order

1. `summarize-run.cjs` (or the line reporter output): error, file:line, customers.
2. `test-results/<test-dir>/test-failed-1.png` — open it with Read; a server error banner
   (e.g. `CBP-10200 - System Error`) or a login page tells you more than the stack trace.
3. `test-results/<test-dir>/error-context.md` — page snapshot (ARIA tree) at failure time.
4. The `customers` attachment: every test that depends on a customer records it with
   `recordCustomer()` (REST sends, batch rows, page objects that open a customer), and the auto fixture
   `customerLog` attaches it on failure. Use those IDs to look the customer up in UI or DB.
5. Rerun just that test once to separate a transient environment error from a real one.

## Classify, then act

| Pattern | Likely cause | Action |
|---|---|---|
| many UI tests cannot find their `NAT…` customer | test customer gone from the environment | recreate via REST (needs the user's yes), update the data file, rerun the spec |
| server error banner, passes on rerun | environment hiccup | report as transient; no code change |
| `Customer: null`, wrong entity | session shared between UI workers | check `UI_WORKERS`/one worker; never add workers |
| everything after one spec logs in | a login/logout spec without `@ends-session` | tag the describe `@ends-session` |
| locator timeout, UI changed | markup changed | fix the page object in `src/ui/pages/`, prefer role/label/testid |
| value differs from test data | app or config wrong, or data out of date | check the data source first; if the source is right, `test.fixme` with ticket + actual behaviour |
| `ErrorMessage` on every REST send | service down / enrichment failing | stop, report; no test change |
| unresolved `${…}` | config | `npm run config:print`; never hardcode a fallback |

Expected values come from the data files under `test-data/` (built from the customer's source
document). Don't change a data file to match the environment unless the source document or the
customer contact says the environment is right — record who decided and when in the file's
`source`/`note` or the plan.

When the app is wrong: keep the check, add `test.fixme(true, '<TICKET or finding>: <what the
environment does>')`, and add or update the finding in the plan (`specs/*.md`). If only part of a
test is affected, split it so the rest keeps running (e.g. one org unit, one contributor).

## Probes (quick environment questions)

For "what does the DB/REST say about X", write a throwaway spec, run it, delete it in the same
command:

```bash
cat > tests/batch/zz-probe.spec.ts <<'EOF'
import { test } from '../fixtures';
test('probe', async ({ db }) => {
  test.setTimeout(180_000);
  console.log(JSON.stringify(await db.query(`select … from apps.… where … like 'NAT%' limit 50`), null, 1));
});
EOF
npx playwright test --project=batch tests/batch/zz-probe.spec.ts --reporter=line; rm tests/batch/zz-probe.spec.ts; git status -s tests
```

`db` (Adminer, read-only, one SELECT), `rt` (REST real-time sends, project `api`), `minio`
(exact keys only). A REST probe writes to the environment: `NAT` keys, and tell the user.

## After a fix

`npm run lint`, rerun the affected spec (with `--reporter=line,json` + import if the user wants it
in the dashboard), update the plan's status/findings, commit only the touched files.
