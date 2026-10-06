/** One timed user action: "user initiates action → screen ready for use". */
export type Measurement = {
  release: string;
  /** Screen / action id, e.g. LOGIN, MENU My Work > My Alerts, ALL_ALERTS_SEARCH. */
  screen: string;
  virtualUser: number;
  user: string;
  iteration: number;
  warmup: boolean;
  /** ISO timestamp of the user action. */
  startedAt: string;
  /** Wall-clock ms from the action until the ready condition held. */
  durationMs: number;
  /** Slowest time-to-first-byte of a document/XHR in the window (≈ server + DB time). */
  serverMs: number | null;
  requests: number;
  /** Path (no query string) of the request behind serverMs. */
  slowestRequest: string;
  /** Result rows rendered, where the screen has a list. */
  rows: number | null;
  /** skipped = not timed: see skipReason. */
  status: 'ok' | 'error' | 'skipped';
  /**
   * role = menu item absent for this user's role;
   * nr-error = NetReveal showed an error instead of the screen (e.g. CFG-10011 "The requested
   * screen does not exist") — screen not ready for testing yet.
   */
  skipReason?: 'role' | 'nr-error';
  error: string;
};

/** Per-statement delta of v$sql between two snapshots. */
export type SqlStatDelta = {
  sqlId: string;
  childNumber: number;
  planHashValue: number;
  module: string;
  schema: string;
  executions: number;
  elapsedMs: number;
  avgElapsedMs: number;
  cpuMs: number;
  bufferGets: number;
  diskReads: number;
  rowsProcessed: number;
  sqlText: string;
};

export type PerfWindow = {
  release: string;
  startedAt: string;
  endedAt: string;
  virtualUsers: number;
  users: string[];
};

/** Screens a user's menu offered (perf.screens=auto) and the ones left out, with reasons. */
export type UserMenu = {
  user: string;
  opened: string[];
  excluded: { path: string; reason: string }[];
};

/** Attachment names the perf reporter reads from test results. */
export const PERF_ATTACHMENTS = {
  menus: 'perf-menus',
  measurements: 'perf-measurements',
  topSql: 'perf-top-sql',
  window: 'perf-window',
} as const;
