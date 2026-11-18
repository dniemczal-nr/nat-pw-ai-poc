#!/usr/bin/env node
/**
 * Summarises one NAT dashboard run (.nat/runs/<id>/summary.json): totals, per-project counts and
 * every failure with its first error lines and the customers it recorded.
 *
 * Usage (from the repo root):
 *   node .claude/skills/nat-framework/scripts/summarize-run.cjs            # latest run
 *   node .claude/skills/nat-framework/scripts/summarize-run.cjs <run-id>   # e.g. 20261118-082923
 *   node .claude/skills/nat-framework/scripts/summarize-run.cjs --skipped  # also list skipped tests
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const showSkipped = args.includes('--skipped');
const runsDir = path.resolve('.nat/runs');
if (!fs.existsSync(runsDir)) {
  console.error('No .nat/runs here: run from the repo root, after `npm run nat:import -- <results.json>` or a dashboard run.');
  process.exit(1);
}
const ids = fs.readdirSync(runsDir).filter((d) => fs.existsSync(path.join(runsDir, d, 'summary.json'))).sort();
const id = args.find((a) => !a.startsWith('--')) ?? ids[ids.length - 1];
const file = path.join(runsDir, id ?? '', 'summary.json');
if (!id || !fs.existsSync(file)) {
  console.error(`No summary.json for run "${id}". Runs: ${ids.slice(-5).join(', ')}`);
  process.exit(1);
}

const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const t = s.totals;
const min = (s.durationMs / 60000).toFixed(1);
console.log(`Run ${id}${s.meta?.importedFrom ? ' (imported)' : ''}: ${t.total} tests, ${t.passed} passed, ${t.failed} failed, ` +
  `${t.flaky} flaky, ${t.skipped} skipped, pass rate ${t.passRate ?? '-'} %, ${min} min`);
console.log(`Report: .nat/runs/${id}/report.html${s.hasNativeReport ? ` · native: .nat/runs/${id}/html/index.html` : ' (no native Playwright report: CLI run, imported)'}`);
console.log('\nBy project:');
for (const b of s.byProject) console.log(`  ${b.key.padEnd(14)} ${b.passed} passed  ${b.failed} failed  ${b.flaky} flaky  ${b.skipped} skipped`);

console.log(`\nFailures (${s.failures.length}):`);
for (const f of s.failures) {
  console.log(`- [${f.project}] ${f.file}:${f.line} › ${f.title}`);
  const err = (f.error ?? '').split('\n').filter(Boolean).slice(0, 3).join(' / ');
  if (err) console.log(`    error: ${err.slice(0, 300)}`);
  console.log(`    customers: ${(f.customers ?? []).join(', ') || '-'}`);
}
if (showSkipped) {
  const skipped = s.tests.filter((x) => x.status === 'skipped');
  console.log(`\nSkipped (${skipped.length}):`);
  for (const x of skipped) console.log(`- [${x.project}] ${x.file} › ${x.title}`);
}
