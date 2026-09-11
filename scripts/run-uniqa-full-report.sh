#!/usr/bin/env bash
# Full UNIQA suite for reporting: main (no session-kill) then auth smokes; merge JSON.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/test-reports test-results
rm -f docs/test-reports/uniqa-full-results.json \
      docs/test-reports/uniqa-auth-smoke-results.json \
      docs/test-reports/uniqa-full-merged.json \
      docs/test-reports/uniqa-full-run.log

echo "=== Main suite (storageState-safe) ===" | tee docs/test-reports/uniqa-full-run.log
set +e
npx playwright test --config=playwright.full-report.config.ts 2>&1 | tee -a docs/test-reports/uniqa-full-run.log
MAIN_EXIT=${PIPESTATUS[0]}
set -e

echo "=== Auth smokes (logout / check-login) — after main ===" | tee -a docs/test-reports/uniqa-full-run.log
set +e
npx playwright test --config=playwright.auth-smoke.config.ts 2>&1 | tee -a docs/test-reports/uniqa-full-run.log
AUTH_EXIT=${PIPESTATUS[0]}
set -e

node <<'NODE'
const fs = require('fs');
const path = 'docs/test-reports';
const main = JSON.parse(fs.readFileSync(`${path}/uniqa-full-results.json`, 'utf8'));
let auth = null;
try {
  auth = JSON.parse(fs.readFileSync(`${path}/uniqa-auth-smoke-results.json`, 'utf8'));
} catch {}
if (auth?.suites?.length) {
  main.suites = [...(main.suites || []), ...(auth.suites || [])];
  const ms = main.stats || {};
  const as = auth.stats || {};
  main.stats = {
    ...ms,
    expected: (ms.expected || 0) + (as.expected || 0),
    unexpected: (ms.unexpected || 0) + (as.unexpected || 0),
    skipped: (ms.skipped || 0) + (as.skipped || 0),
    flaky: (ms.flaky || 0) + (as.flaky || 0),
    duration: (ms.duration || 0) + (as.duration || 0),
  };
}
fs.writeFileSync(`${path}/uniqa-full-merged.json`, JSON.stringify(main, null, 2));
fs.copyFileSync(`${path}/uniqa-full-merged.json`, `${path}/uniqa-full-results.json`);
console.log('Merged results → docs/test-reports/uniqa-full-results.json');
NODE

node scripts/generate-uniqa-full-report.mjs
echo "MAIN_EXIT=$MAIN_EXIT AUTH_EXIT=$AUTH_EXIT" | tee -a docs/test-reports/uniqa-full-run.log
exit 0
