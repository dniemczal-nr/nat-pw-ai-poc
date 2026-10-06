/**
 * Compare two perf runs (summary.json) per screen on p90.
 *
 *   npm run perf:compare -- <baseline/summary.json> <current/summary.json> [--threshold=20] [--fail-on-regression]
 *
 * Prints a Markdown table (paste into Jira / Confluence) and exits 1 on regression when asked.
 */
import fs from 'fs';
import path from 'path';
import { compare, comparisonMarkdown, type PerfSummary } from '../src/perf/stats';

function readSummary(file: string): PerfSummary {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    throw new Error(`perf:compare: file not found: ${full}`);
  }
  return JSON.parse(fs.readFileSync(full, 'utf8')) as PerfSummary;
}

function main(): void {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith('--'));
  if (files.length !== 2) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run perf:compare -- <baseline summary.json> <current summary.json> [--threshold=20] [--fail-on-regression]');
    process.exit(2);
  }

  const thresholdArg = args.find((a) => a.startsWith('--threshold='));
  const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : 20;
  const failOnRegression = args.includes('--fail-on-regression');

  const baseline = readSummary(files[0]);
  const current = readSummary(files[1]);
  const rows = compare(baseline, current, threshold);

  // eslint-disable-next-line no-console
  console.log(comparisonMarkdown(rows, baseline.release, current.release));

  const regressions = rows.filter((r) => r.status === 'REGRESSION');
  if (regressions.length) {
    // eslint-disable-next-line no-console
    console.log(`\n${regressions.length} screen(s) slower than ${threshold}% on p90.`);
    if (failOnRegression) process.exit(1);
  }
}

main();
