import * as config from '../config';

export type PerfConfig = {
  release: string;
  /** Login of the single-user baseline (§1) — should see every screen in perf.screens. */
  baselineUser: string;
  /** Pause between actions in the single-user baseline (0 = back to back, like NAT). */
  baselineThinkTimeMs: number;
  users: string[];
  virtualUsers: number;
  iterations: number;
  warmupIterations: number;
  thinkTimeMs: number;
  rampUpMs: number;
  readyTimeoutMs: number;
  ready: { networkQuietMs: number; maxRequestWaitMs: number; ignoreRequests: RegExp | null };
  testTimeoutMs: number;
  viewport: { width: number; height: number };
  /** Explicit menu paths; empty when screensAuto. */
  screens: string[];
  /** perf.screens=auto — open every screen the user's own menu offers. */
  screensAuto: boolean;
  menu: { include: RegExp | null; exclude: RegExp | null };
  allAlerts: {
    menuPath: string;
    view: string;
    /** WLM view search criteria as NAT `field | value` rows (empty = plain Search). */
    criteria: [string, string][];
    search: boolean;
    openAlertDetails: boolean;
  };
  thresholds: Record<string, number>;
  enforceThresholds: boolean;
  maxErrorRatePct: number;
  baselineFile: string;
  regressionThresholdPct: number;
  db: {
    captureTopSql: boolean;
    topSqlLimit: number;
    timedQueries: string[];
    queryIterations: number;
    maxQueryMs: number;
    maxRows: number;
  };
  /** Resolved application.environment (set by the NR_ENV alias file, e.g. perf93). */
  environment: string;
  load: {
    /** application.environment values where more than maxUsersElsewhere users may run. */
    allowedEnvironments: string[];
    maxUsersElsewhere: number;
    /** Rough browser memory per virtual user, for the free-memory warning. */
    memoryPerUserMb: number;
  };
  /** Print every Gherkin step in the console (list reporter). */
  printSteps: boolean;
  /**
   * Multi-machine run: this machine runs virtual users whose global number n satisfies
   * (n - 1) % total === index - 1. From PERF_SHARD=index/total (default 1/1).
   */
  shard: { index: number; total: number };
  /** Epoch ms all machines wait for before the first login (PERF_START_AT), or null. */
  startAt: number | null;
  /** On-demand start: URL of `npm run perf:coordinator` (PERF_COORDINATOR), or ''. */
  coordinator: string;
  /** Menu screens a user's role cannot see are recorded as n/a instead of errors. */
  skipUnavailableScreens: boolean;
  /** Office arrival: each virtual user starts at a random moment within this window (0 = rampUpMs only). */
  arrivalWindowMs: number;
  /** Timeout of navigations/actions inside a virtual user's browser context. */
  actionTimeoutMs: number;
  /** Upper bound of a random think time (thinkTimeMs..thinkTimeMaxMs); 0 = fixed thinkTimeMs. */
  thinkTimeMaxMs: number;
  /** Screens opened per iteration, picked at random in random order (0 = all of them). */
  screensPerIteration: number;
};

function str(key: string, fallback = ''): string {
  return config.getOrDefault(key, fallback).trim();
}

function int(key: string, fallback: number): number {
  const raw = str(key, String(fallback));
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Config error: "${key}" must be a non-negative number (got "${raw}")`);
  }
  return Math.floor(value);
}

function bool(key: string, fallback: boolean): boolean {
  return str(key, String(fallback)).toLowerCase() === 'true';
}

function list(key: string, separator: string): string[] {
  return str(key)
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function viewport(key: string): { width: number; height: number } {
  const raw = str(key, '1920x1080');
  const match = /^(\d+)\s*x\s*(\d+)$/i.exec(raw);
  if (!match) {
    throw new Error(`Config error: "${key}" must look like 1920x1080 (got "${raw}")`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** `Field A=value;Field B=value` → [["Field A","value"], …] (order kept; first `=` splits). */
function pairs(key: string): [string, string][] {
  return list(key, ';').map((entry) => {
    const at = entry.indexOf('=');
    if (at <= 0) throw new Error(`Config error: "${key}" entry "${entry}" must be Field=value`);
    return [entry.slice(0, at).trim(), entry.slice(at + 1).trim()];
  });
}

/** PERF_SHARD=2/4 → { index: 2, total: 4 } */
function shard(raw: string | undefined): { index: number; total: number } {
  if (!raw) return { index: 1, total: 1 };
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(raw);
  const index = m ? Number(m[1]) : NaN;
  const total = m ? Number(m[2]) : NaN;
  if (!m || total < 1 || index < 1 || index > total) {
    throw new Error(`Config error: PERF_SHARD must look like 2/4 (index/total), got "${raw}"`);
  }
  return { index, total };
}

/** PERF_START_AT=14:30 or 14:30:15 (today, local time) or a full ISO timestamp. */
function startAt(raw: string | undefined): number | null {
  if (!raw) return null;
  const hm = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(raw);
  if (hm) {
    const d = new Date();
    d.setHours(Number(hm[1]), Number(hm[2]), Number(hm[3] || 0), 0);
    return d.getTime();
  }
  const t = Date.parse(raw);
  if (Number.isNaN(t)) throw new Error(`Config error: PERF_START_AT must be HH:MM[:SS] or ISO, got "${raw}"`);
  return t;
}

function regex(key: string): RegExp | null {
  const raw = str(key);
  if (!raw) return null;
  try {
    return new RegExp(raw, 'i');
  } catch (err) {
    throw new Error(`Config error: "${key}" is not a valid regular expression: ${(err as Error).message}`);
  }
}

/** `LOGIN=5000;ALL_ALERTS_SEARCH=10000` → { LOGIN: 5000, ALL_ALERTS_SEARCH: 10000 } */
function thresholds(key: string): Record<string, number> {
  const result: Record<string, number> = {};
  list(key, ';').forEach((entry) => {
    const at = entry.lastIndexOf('=');
    const screen = entry.slice(0, at).trim();
    const ms = Number(entry.slice(at + 1));
    if (at <= 0 || !Number.isFinite(ms)) {
      throw new Error(`Config error: "${key}" entry "${entry}" must be SCREEN=milliseconds`);
    }
    result[screen] = ms;
  });
  return result;
}

/**
 * Resolved `perf.*` settings. Safe to call at collection time (`playwright test --list`)
 * because nothing here needs a live environment.
 */
export function loadPerfConfig(): PerfConfig {
  const users = list('perf.users', ',');
  const screensAuto = str('perf.screens').toLowerCase() === 'auto';
  return {
    release: str('perf.release', 'unversioned'),
    baselineUser: str('perf.baselineUser', 'admin'),
    baselineThinkTimeMs: int('perf.baseline.thinkTimeMs', 0),
    users: users.length ? users : ['admin'],
    virtualUsers: Math.max(1, int('perf.virtualUsers', 1)),
    iterations: Math.max(1, int('perf.iterations', 5)),
    warmupIterations: int('perf.warmupIterations', 1),
    thinkTimeMs: int('perf.thinkTimeMs', 1000),
    rampUpMs: int('perf.rampUpMs', 2000),
    readyTimeoutMs: int('perf.readyTimeoutMs', 60000),
    ready: {
      networkQuietMs: int('perf.ready.networkQuietMs', 200),
      maxRequestWaitMs: int('perf.ready.maxRequestWaitMs', 0),
      ignoreRequests: regex('perf.ready.ignoreRequests'),
    },
    testTimeoutMs: int('perf.testTimeoutMs', 1800000),
    viewport: viewport('perf.viewport'),
    screens: screensAuto ? [] : list('perf.screens', ';'),
    screensAuto,
    menu: { include: regex('perf.menu.include'), exclude: regex('perf.menu.exclude') },
    allAlerts: {
      menuPath: str('perf.allAlerts.menuPath', 'Group Work->All Alerts'),
      view: str('perf.allAlerts.view'),
      criteria: pairs('perf.allAlerts.criteria'),
      search: bool('perf.journey.allAlertsSearch', true),
      openAlertDetails: bool('perf.journey.openAlertDetails', true),
    },
    thresholds: thresholds('perf.thresholds'),
    enforceThresholds: bool('perf.enforceThresholds', false),
    maxErrorRatePct: int('perf.maxErrorRatePct', 5),
    baselineFile: str('perf.baselineFile'),
    regressionThresholdPct: int('perf.regressionThresholdPct', 20),
    db: {
      captureTopSql: bool('perf.db.captureTopSql', false),
      topSqlLimit: Math.max(1, int('perf.db.topSqlLimit', 25)),
      timedQueries: list('perf.db.timedQueries', ';'),
      queryIterations: Math.max(1, int('perf.db.queryIterations', 3)),
      maxQueryMs: int('perf.db.maxQueryMs', 1000),
      maxRows: Math.max(1, int('perf.db.maxRows', 120)),
    },
    environment: str('application.environment'),
    load: {
      allowedEnvironments: list('perf.load.allowedEnvironments', ','),
      maxUsersElsewhere: int('perf.load.maxUsersElsewhere', 5),
      memoryPerUserMb: Math.max(1, int('perf.load.memoryPerUserMb', 150)),
    },
    printSteps: bool('perf.printSteps', true),
    shard: shard(process.env.PERF_SHARD),
    startAt: startAt(process.env.PERF_START_AT),
    coordinator: (process.env.PERF_COORDINATOR || '').trim().replace(/\/+$/, ''),
    skipUnavailableScreens: bool('perf.skipUnavailableScreens', true),
    arrivalWindowMs: int('perf.arrivalWindowMs', 0),
    actionTimeoutMs: int('perf.actionTimeoutMs', 30000),
    thinkTimeMaxMs: int('perf.thinkTimeMaxMs', 0),
    screensPerIteration: int('perf.screensPerIteration', 0),
  };
}
