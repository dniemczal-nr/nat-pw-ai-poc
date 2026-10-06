import type { Measurement } from './types';

export type ScreenSummary = {
  screen: string;
  samples: number;
  errors: number;
  /** Not available to the user's role (menu item absent). */
  skipped: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  maxMs: number;
  /** p90 of the slowest server response per sample (≈ server + DB time). */
  serverP90Ms: number | null;
  /** Most frequent slowest request — where to look first for a long-running query. */
  topSlowRequest: string;
};

export type PerfSummary = {
  release: string;
  runId: string;
  generatedAt: string;
  virtualUsers: number;
  screens: ScreenSummary[];
};

export type ComparisonRow = {
  screen: string;
  baselineP90Ms: number | null;
  currentP90Ms: number | null;
  deltaPct: number | null;
  status: 'OK' | 'REGRESSION' | 'IMPROVED' | 'NEW' | 'MISSING';
};

/** Nearest-rank percentile. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

function mostFrequent(values: string[]): string {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = '';
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

export function summarize(measurements: Measurement[]): ScreenSummary[] {
  const byScreen = new Map<string, Measurement[]>();
  measurements
    .filter((m) => !m.warmup)
    .forEach((m) => byScreen.set(m.screen, [...(byScreen.get(m.screen) || []), m]));

  return [...byScreen.entries()]
    .map(([screen, items]) => {
      const ok = items.filter((m) => m.status === 'ok');
      const skipped = items.filter((m) => m.status === 'skipped').length;
      const durations = ok.map((m) => m.durationMs);
      const server = ok.map((m) => m.serverMs).filter((v): v is number => v != null);
      return {
        screen,
        samples: ok.length,
        errors: items.length - ok.length - skipped,
        skipped,
        minMs: durations.length ? Math.min(...durations) : 0,
        avgMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        p50Ms: percentile(durations, 50),
        p90Ms: percentile(durations, 90),
        p95Ms: percentile(durations, 95),
        maxMs: durations.length ? Math.max(...durations) : 0,
        serverP90Ms: server.length ? percentile(server, 90) : null,
        topSlowRequest: mostFrequent(ok.map((m) => m.slowestRequest)),
      };
    })
    .sort((a, b) => a.screen.localeCompare(b.screen));
}

/** Compare p90 per screen; a rise above `thresholdPct` is a regression. */
export function compare(baseline: PerfSummary, current: PerfSummary, thresholdPct: number): ComparisonRow[] {
  const base = new Map(baseline.screens.map((s) => [s.screen, s]));
  const curr = new Map(current.screens.map((s) => [s.screen, s]));
  const screens = [...new Set([...base.keys(), ...curr.keys()])].sort();

  return screens.map((screen) => {
    const b = base.get(screen);
    const c = curr.get(screen);
    if (!b || !b.samples) {
      return { screen, baselineP90Ms: null, currentP90Ms: c ? c.p90Ms : null, deltaPct: null, status: 'NEW' };
    }
    if (!c || !c.samples) {
      return { screen, baselineP90Ms: b.p90Ms, currentP90Ms: null, deltaPct: null, status: 'MISSING' };
    }
    const deltaPct = b.p90Ms === 0 ? 0 : Math.round(((c.p90Ms - b.p90Ms) / b.p90Ms) * 1000) / 10;
    let status: ComparisonRow['status'] = 'OK';
    if (deltaPct > thresholdPct) status = 'REGRESSION';
    else if (deltaPct < -thresholdPct) status = 'IMPROVED';
    return { screen, baselineP90Ms: b.p90Ms, currentP90Ms: c.p90Ms, deltaPct, status };
  });
}

/** Per-screen table printed after every run and written to summary.md. */
export function summaryMarkdown(summary: PerfSummary): string {
  return [
    `# Front-end performance — ${summary.release}`,
    '',
    `Run: \`${summary.runId}\` · virtual users: ${summary.virtualUsers}`,
    '',
    '| Screen | n | errors | n/a | p50 | p90 | p95 | max | server p90 | slowest request |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...summary.screens.map(
      (s) =>
        `| ${s.screen} | ${s.samples} | ${s.errors} | ${s.skipped ?? 0} | ${s.p50Ms} | ${s.p90Ms} | ${s.p95Ms} | ${s.maxMs} | ` +
        `${s.serverP90Ms ?? '—'} | ${s.topSlowRequest || '—'} |`,
    ),
  ].join('\n');
}

export function comparisonMarkdown(rows: ComparisonRow[], baselineLabel: string, currentLabel: string): string {
  const fmt = (v: number | null) => (v == null ? '—' : String(v));
  const lines = [
    `| Screen | ${baselineLabel} p90 (ms) | ${currentLabel} p90 (ms) | Δ % | Status |`,
    '|---|---:|---:|---:|---|',
    ...rows.map(
      (r) => `| ${r.screen} | ${fmt(r.baselineP90Ms)} | ${fmt(r.currentP90Ms)} | ${fmt(r.deltaPct)} | ${r.status} |`,
    ),
  ];
  return lines.join('\n');
}
