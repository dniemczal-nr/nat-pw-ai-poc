import fs from 'fs';
import path from 'path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { loadPerfConfig } from './perfConfig';
import { compare, comparisonMarkdown, summarize, summaryMarkdown, type PerfSummary } from './stats';
import { PERF_ATTACHMENTS, type Measurement, type PerfWindow, type SqlStatDelta, type UserMenu } from './types';

const ROOT_DIR = path.join(__dirname, '../..');

const MEASUREMENT_COLUMNS: (keyof Measurement)[] = [
  'release',
  'screen',
  'virtualUser',
  'user',
  'iteration',
  'warmup',
  'startedAt',
  'durationMs',
  'serverMs',
  'requests',
  'slowestRequest',
  'rows',
  'status',
  'skipReason',
  'error',
];

const TOP_SQL_COLUMNS: (keyof SqlStatDelta)[] = [
  'sqlId',
  'childNumber',
  'planHashValue',
  'module',
  'schema',
  'executions',
  'elapsedMs',
  'avgElapsedMs',
  'cpuMs',
  'bufferGets',
  'diskReads',
  'rowsProcessed',
  'sqlText',
];

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv<T extends object>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.map(String).join(',');
  const body = rows.map((row) => columns.map((c) => csvCell(row[c])).join(','));
  return [header, ...body].join('\n') + '\n';
}

function readAttachment<T>(result: TestResult, name: string): T | null {
  const attachment = result.attachments.find((a) => a.name === name);
  if (!attachment) return null;
  const raw = attachment.body
    ? attachment.body.toString('utf8')
    : attachment.path && fs.existsSync(attachment.path)
      ? fs.readFileSync(attachment.path, 'utf8')
      : null;
  return raw ? (JSON.parse(raw) as T) : null;
}

/**
 * Aggregates perf attachments from all tests into reports/perf/<runId>/:
 * measurements.csv · summary.json · summary.md · top-sql.csv · window.json.
 * Does nothing when the run produced no perf measurements.
 */
export default class PerfReporter implements Reporter {
  private readonly measurements: Measurement[] = [];
  private readonly topSql: SqlStatDelta[] = [];
  private readonly windows: PerfWindow[] = [];
  private readonly menus: UserMenu[] = [];

  private readonly errorShots: { name: string; body: Buffer }[] = [];

  onTestEnd(_test: TestCase, result: TestResult): void {
    result.attachments
      .filter((a) => a.name.startsWith('error ') && a.contentType === 'image/png')
      .forEach((a) => {
        const body = a.body ?? (a.path && fs.existsSync(a.path) ? fs.readFileSync(a.path) : null);
        if (body) this.errorShots.push({ name: a.name, body });
      });
    this.measurements.push(...(readAttachment<Measurement[]>(result, PERF_ATTACHMENTS.measurements) || []));
    this.topSql.push(...(readAttachment<SqlStatDelta[]>(result, PERF_ATTACHMENTS.topSql) || []));
    this.menus.push(...(readAttachment<UserMenu[]>(result, PERF_ATTACHMENTS.menus) || []));
    const window = readAttachment<PerfWindow>(result, PERF_ATTACHMENTS.window);
    if (window) this.windows.push(window);
  }

  onEnd(_result: FullResult): void {
    if (!this.measurements.length && !this.topSql.length) return;

    const cfg = loadPerfConfig();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shardSuffix = cfg.shard.total > 1 ? `_shard${cfg.shard.index}of${cfg.shard.total}` : '';
    const runId = `${process.env.PERF_RUN_ID || `${cfg.release}_${stamp}`}${shardSuffix}`.replace(/[^\w.-]+/g, '_');
    const outDir = path.join(ROOT_DIR, 'reports/perf', runId);
    fs.mkdirSync(outDir, { recursive: true });

    const summary: PerfSummary = {
      release: cfg.release,
      runId,
      generatedAt: new Date().toISOString(),
      virtualUsers: Math.max(0, ...this.measurements.map((m) => m.virtualUser)),
      screens: summarize(this.measurements),
    };

    fs.writeFileSync(path.join(outDir, 'measurements.csv'), toCsv(this.measurements, MEASUREMENT_COLUMNS));
    // Same rows as JSON, input for `npm run perf:merge` (runs from several machines).
    fs.writeFileSync(path.join(outDir, 'measurements.json'), JSON.stringify(this.measurements));
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
    if (this.topSql.length) {
      fs.writeFileSync(path.join(outDir, 'top-sql.csv'), toCsv(this.topSql, TOP_SQL_COLUMNS));
    }
    if (this.windows.length) {
      fs.writeFileSync(path.join(outDir, 'window.json'), JSON.stringify(this.windows, null, 2));
    }
    if (this.errorShots.length) {
      // Screenshot taken at the moment each step failed: screenshots/<vu>_<iteration>_<screen>.png
      const dir = path.join(outDir, 'screenshots');
      fs.mkdirSync(dir, { recursive: true });
      this.errorShots.forEach((s) =>
        fs.writeFileSync(path.join(dir, `${s.name.replace(/[^\w.-]+/g, '_')}.png`), s.body),
      );
    }
    if (this.menus.length) {
      // Per login: which screens its menu offered and which were left out (and why).
      fs.writeFileSync(path.join(outDir, 'menus.json'), JSON.stringify(this.menus, null, 2));
    }

    const lines = [summaryMarkdown(summary)];

    // Screens NR answered with an error page (not ready for testing) — one line per screen.
    const notReady = new Map<string, string>();
    this.measurements
      .filter((m) => m.skipReason === 'nr-error')
      .forEach((m) => notReady.set(m.screen, m.error));
    if (notReady.size) {
      lines.push(
        '',
        '## Skipped — NetReveal error instead of the screen (not ready for testing)',
        '',
        ...[...notReady.entries()].map(([screen, error]) => `- ${screen}: ${error}`),
      );
    }

    if (cfg.baselineFile) {
      const baselinePath = path.isAbsolute(cfg.baselineFile)
        ? cfg.baselineFile
        : path.join(ROOT_DIR, cfg.baselineFile);
      if (fs.existsSync(baselinePath)) {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as PerfSummary;
        const rows = compare(baseline, summary, cfg.regressionThresholdPct);
        lines.push(
          '',
          `## vs baseline ${baseline.release} (±${cfg.regressionThresholdPct}% on p90)`,
          '',
          comparisonMarkdown(rows, baseline.release, cfg.release),
        );
      } else {
        lines.push('', `> Baseline file not found: ${cfg.baselineFile}`);
      }
    }

    const markdown = lines.join('\n') + '\n';
    fs.writeFileSync(path.join(outDir, 'summary.md'), markdown);
    // eslint-disable-next-line no-console
    const shots = this.errorShots.length ? ` (error screenshots: ${this.errorShots.length} in screenshots/)` : '';
    console.log(`\n${markdown}\nPerf results: ${path.relative(ROOT_DIR, outDir)}${shots}`);
  }
}
