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
  /** Login and virtual-user number behind the longest duration (absent in summaries written before this existed). */
  slowestUser?: string;
  slowestVu?: number;
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
      const slowest = ok.reduce<Measurement | null>((a, m) => (!a || m.durationMs > a.durationMs ? m : a), null);
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
        slowestUser: slowest?.user,
        slowestVu: slowest?.virtualUser,
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

function slowestLabel(s: ScreenSummary): string {
  if (!s.slowestUser) return '—';
  return s.slowestVu ? `${s.slowestUser} (VU ${s.slowestVu})` : s.slowestUser;
}

const isAllAlertsMenu = (screen: string) => /^MENU .*> All Alerts$/.test(screen);
const inAllAlertsSearch = (screen: string) =>
  isAllAlertsMenu(screen) || screen.startsWith('ALL_ALERTS_') || screen.startsWith('ALERT_DETAILS_');

/** Plain-language name of a screen id, for people reading the report rather than the code. */
export function screenLabel(screen: string): string {
  if (screen === 'LOGIN') return 'Log in';
  if (screen === 'LOGOUT') return 'Log out';
  if (screen === 'ALL_ALERTS_SEARCH') return 'Search alerts';
  if (screen === 'ALERT_DETAILS_OPEN') return 'Open first unlocked alert';
  if (screen === 'ALERT_DETAILS_BACK') return 'Back to All Alerts';
  if (screen.startsWith('ALL_ALERTS_VIEW ')) return `Switch result view to ${screen.slice('ALL_ALERTS_VIEW '.length)}`;
  if (screen.startsWith('MENU ')) return `Open ${screen.slice('MENU '.length).replace(/ > /g, ' › ')}`;
  if (screen.startsWith('DB ')) return `SQL ${screen.slice('DB '.length)}`;
  return screen;
}

/** Order inside the All Alerts search group: the order a user goes through it. */
function allAlertsStep(screen: string): number {
  if (isAllAlertsMenu(screen)) return 0;
  if (screen.startsWith('ALL_ALERTS_VIEW ')) return 1;
  const step = ['ALL_ALERTS_SEARCH', 'ALERT_DETAILS_OPEN', 'ALERT_DETAILS_BACK'].indexOf(screen);
  return step < 0 ? 5 : step + 2;
}

const seconds = (ms: number) => (ms / 1000).toFixed(2);

function table(rows: ScreenSummary[], withUnavailable: boolean): string[] {
  return [
    `| Action | Runs | Errors |${withUnavailable ? ' Not available |' : ''} Median (s) | p90 (s) | p95 (s) | Max (s) | Server p90 (s) | Slowest user |`,
    `|---|---:|---:|${withUnavailable ? '---:|' : ''}---:|---:|---:|---:|---:|---|`,
    ...rows.map(
      (s) =>
        `| ${screenLabel(s.screen)} | ${s.samples} | ${s.errors ? `**${s.errors}**` : 0} |` +
        `${withUnavailable ? ` ${s.skipped ?? 0} |` : ''}` +
        ` ${seconds(s.p50Ms)} | ${seconds(s.p90Ms)} | ${seconds(s.p95Ms)} | ${seconds(s.maxMs)} |` +
        ` ${s.serverP90Ms == null ? '—' : seconds(s.serverP90Ms)} | ${slowestLabel(s)} |`,
    ),
  ];
}

/** Report printed after every run and written to summary.md: overview, slowest actions, grouped tables. */
export function summaryMarkdown(summary: PerfSummary): string {
  const screens = summary.screens;
  const session = ['LOGIN', 'LOGOUT'].flatMap((id) => screens.filter((s) => s.screen === id));
  const allAlerts = screens
    .filter((s) => inAllAlertsSearch(s.screen))
    .sort((a, b) => allAlertsStep(a.screen) - allAlertsStep(b.screen));
  const grouped = new Set([...session, ...allAlerts]);
  const others = screens.filter((s) => !grouped.has(s)).sort((a, b) => b.p90Ms - a.p90Ms);
  const withUnavailable = screens.some((s) => (s.skipped ?? 0) > 0);

  const runs = screens.reduce((sum, s) => sum + s.samples, 0);
  const errors = screens.reduce((sum, s) => sum + s.errors, 0);
  const generated = summary.generatedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace(/Z$/, ' UTC');
  const slowest = screens
    .filter((s) => s.samples > 0 && !s.screen.startsWith('JOURNEY_'))
    .sort((a, b) => b.p90Ms - a.p90Ms)
    .slice(0, 3);

  const lines = [
    `# Front-end performance — ${summary.release}`,
    '',
    `- **Run:** \`${summary.runId}\` (${generated})`,
    `- **Virtual users:** ${summary.virtualUsers}`,
    `- **Actions measured:** ${runs} · **errors:** ${errors}`,
    '',
  ];
  if (slowest.length) {
    lines.push(
      '**Slowest actions (p90):**',
      '',
      ...slowest.map(
        (s, i) =>
          `${i + 1}. ${screenLabel(s.screen)} — **${seconds(s.p90Ms)} s**` +
          `${s.serverP90Ms == null ? '' : ` (server ${seconds(s.serverP90Ms)} s)`}, slowest: ${slowestLabel(s)}`,
      ),
      '',
    );
  }
  const section = (title: string, rows: ScreenSummary[]) => {
    if (rows.length) lines.push(`### ${title}`, '', ...table(rows, withUnavailable), '');
  };
  section('Log in and log out', session);
  section('All Alerts search', allAlerts);
  section('Other screens (slowest first)', others);
  lines.push(
    '_Times in seconds, from the user action until the screen is ready. Runs = successful measurements. ' +
      'Median / p90 / p95 = half / 90% / 95% of runs were at least this fast. ' +
      'Server p90 = the slowest server response inside the action (server + database time); ' +
      'a large gap to p90 is browser-side time._',
  );
  return lines.join('\n');
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
