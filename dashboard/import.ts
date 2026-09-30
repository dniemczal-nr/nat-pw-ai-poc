/**
 * Turn existing Playwright JSON reports into NAT runs so the dashboard can chart them.
 *   npm run nat:import -- <results.json> [more.json …]
 *   npm run nat:import -- --rerender      # rebuild summaries and report.html files with the current code
 */
import fs from 'node:fs';
import path from 'node:path';
import { readJson, runIdFor, writeJson } from './lib/runner';
import { renderReportHtml, summarize, type JsonResults, type RunMeta, type RunSummary } from './lib/report';

const ROOT = path.resolve(__dirname, '..');
const RUNS_DIR = path.join(ROOT, '.nat', 'runs');

type RecordedResults = JsonResults & {
  stats: JsonResults['stats'] & { unexpected?: number };
  config: JsonResults['config'] & {
    workers?: number;
    metadata?: { actualWorkers?: number };
    projects?: { name: string }[];
  };
};

function importFile(source: string): void {
  const abs = path.resolve(source);
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  const results = readJson<RecordedResults>(abs);
  if (!results || !Array.isArray(results.suites) || !results.stats?.startTime || !results.config) {
    throw new Error(`${rel}: not a Playwright JSON report (expected config, suites and stats)`);
  }

  for (const id of fs.existsSync(RUNS_DIR) ? fs.readdirSync(RUNS_DIR) : []) {
    const meta = readJson<RunMeta>(path.join(RUNS_DIR, id, 'meta.json'));
    if (meta?.importedFrom === rel && meta.startedAt === results.stats.startTime) {
      console.log(`skip  ${rel} — already imported as ${id}`);
      return;
    }
  }

  // Reports recorded on another machine or in a container carry a foreign rootDir; map it onto this repo.
  if (!results.config.rootDir.startsWith(ROOT)) {
    results.config.rootDir = path.join(ROOT, path.basename(results.config.rootDir));
  }

  const started = new Date(results.stats.startTime);
  const id = runIdFor(started, RUNS_DIR);
  const dir = path.join(RUNS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  const meta: RunMeta = {
    id,
    startedAt: started.toISOString(),
    finishedAt: new Date(started.getTime() + results.stats.duration).toISOString(),
    exitCode: (results.stats.unexpected ?? 0) > 0 ? 1 : 0,
    importedFrom: rel,
    selection: {
      files: [],
      locations: [],
      projects: (results.config.projects ?? []).map((p) => p.name),
      workers: results.config.metadata?.actualWorkers ?? results.config.workers ?? null,
      grep: null,
      env: null,
    },
  };
  const summary = summarize(results, meta, ROOT, false);
  writeJson(path.join(dir, 'meta.json'), meta);
  writeJson(path.join(dir, 'results.json'), results);
  writeJson(path.join(dir, 'summary.json'), summary);
  fs.writeFileSync(path.join(dir, 'report.html'), renderReportHtml(summary));
  fs.writeFileSync(path.join(dir, 'stdout.log'), `[nat] imported from ${rel}; the original console output was not recorded.\n`);
  const t = summary.totals;
  console.log(`added ${rel} → .nat/runs/${id} (${t.total} tests: ${t.passed} passed, ${t.failed} failed, ${t.flaky} flaky, ${t.skipped} skipped)`);
}

/** Rebuilds summaries from results.json where it exists (so older runs pick up summary fixes), then every report.html. */
function rerender(): void {
  let count = 0;
  for (const id of fs.existsSync(RUNS_DIR) ? fs.readdirSync(RUNS_DIR).sort() : []) {
    const dir = path.join(RUNS_DIR, id);
    const meta = readJson<RunMeta>(path.join(dir, 'meta.json'));
    const results = readJson<RecordedResults>(path.join(dir, 'results.json'));
    let summary = readJson<RunSummary>(path.join(dir, 'summary.json'));
    if (meta && results && summary) {
      summary = summarize(results, meta, ROOT, summary.hasNativeReport);
      writeJson(path.join(dir, 'summary.json'), summary);
    }
    if (!summary) continue;
    fs.writeFileSync(path.join(dir, 'report.html'), renderReportHtml(summary));
    count++;
  }
  console.log(`re-rendered ${count} report${count === 1 ? '' : 's'} in .nat/runs/`);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: npm run nat:import -- <results.json> [more.json …]  |  npm run nat:import -- --rerender');
  process.exit(2);
}
if (args.includes('--rerender')) {
  rerender();
} else {
  let failed = false;
  for (const file of args) {
    try {
      importFile(file);
    } catch (err) {
      failed = true;
      console.error(`error ${(err as Error).message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
