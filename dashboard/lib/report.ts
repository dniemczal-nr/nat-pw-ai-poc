import path from 'node:path';

export type Outcome = 'passed' | 'failed' | 'flaky' | 'skipped';

export type TestRow = {
  file: string;
  line: number;
  title: string;
  project: string;
  status: Outcome;
  durationMs: number;
  error?: string;
};

export type Bucket = {
  key: string;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  durationMs: number;
};

export type RunSelection = {
  files: string[];
  locations: string[];
  projects: string[];
  workers: number | null;
  grep: string | null;
};

export type RunMeta = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  stopped?: boolean;
  selection: RunSelection;
};

export type RunSummary = {
  meta: RunMeta;
  durationMs: number;
  totals: {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
    /** 0–100, computed over non-skipped tests; null when nothing ran. */
    passRate: number | null;
  };
  byProject: Bucket[];
  byFile: Bucket[];
  slowest: TestRow[];
  failures: TestRow[];
  tests: TestRow[];
  hasNativeReport: boolean;
};

export type JsonResults = {
  config: { rootDir: string };
  suites: JsonSuite[];
  stats: { startTime: string; duration: number };
};

type JsonSuite = { title: string; specs?: JsonSpec[]; suites?: JsonSuite[] };

type JsonSpec = {
  title: string;
  file: string;
  line: number;
  tests?: JsonTest[];
};

type JsonTest = {
  projectName: string;
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  results?: {
    status: string;
    duration: number;
    error?: { message?: string };
    errors?: { message?: string }[];
  }[];
};

const STATUS_MAP: Record<JsonTest['status'], Outcome> = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped',
};

export function summarize(
  results: JsonResults | null,
  meta: RunMeta,
  cwd: string,
  hasNativeReport: boolean,
): RunSummary {
  const tests: TestRow[] = [];
  if (results) {
    const rootDir = results.config.rootDir;
    const walk = (suite: JsonSuite, ancestors: string[], isRoot: boolean): void => {
      const next = isRoot ? [] : [...ancestors, suite.title];
      for (const spec of suite.specs ?? []) {
        const file = path.relative(cwd, path.join(rootDir, spec.file)).split(path.sep).join('/');
        const title = [...next, spec.title].join(' › ');
        for (const t of spec.tests ?? []) {
          const runs = t.results ?? [];
          const last = runs[runs.length - 1];
          tests.push({
            file,
            line: spec.line,
            title,
            project: t.projectName,
            status: STATUS_MAP[t.status] ?? 'skipped',
            durationMs: last?.duration ?? 0,
            error: t.status === 'unexpected' ? firstError(runs) : undefined,
          });
        }
      }
      for (const child of suite.suites ?? []) walk(child, next, false);
    };
    for (const root of results.suites) walk(root, [], true);
  }

  const totals = { total: tests.length, passed: 0, failed: 0, flaky: 0, skipped: 0 };
  for (const t of tests) totals[t.status] += 1;
  const ran = totals.total - totals.skipped;
  const passRate = ran > 0 ? Math.round(((totals.passed + totals.flaky) / ran) * 1000) / 10 : null;

  const started = Date.parse(meta.startedAt);
  const finished = meta.finishedAt ? Date.parse(meta.finishedAt) : Date.now();
  const durationMs = results?.stats.duration ?? Math.max(0, finished - started);

  return {
    meta,
    durationMs,
    totals: { ...totals, passRate },
    byProject: bucketBy(tests, (t) => t.project),
    byFile: bucketBy(tests, (t) => t.file),
    slowest: [...tests]
      .filter((t) => t.status !== 'skipped')
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10),
    failures: tests.filter((t) => t.status === 'failed'),
    tests,
    hasNativeReport,
  };
}

function bucketBy(tests: TestRow[], keyOf: (t: TestRow) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const t of tests) {
    const key = keyOf(t);
    const b = map.get(key) ?? { key, passed: 0, failed: 0, flaky: 0, skipped: 0, durationMs: 0 };
    b[t.status] += 1;
    b.durationMs += t.durationMs;
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function firstError(runs: NonNullable<JsonTest['results']>): string | undefined {
  for (const r of runs) {
    const msg = r.error?.message ?? r.errors?.[0]?.message;
    if (msg) {
      const clean = msg.replace(/\[[0-9;]*m/g, '').trim();
      const lines = clean.split('\n').slice(0, 8).join('\n');
      return lines.length > 700 ? `${lines.slice(0, 700)}…` : lines;
    }
  }
  return undefined;
}

/**
 * Standalone HTML report: no external assets, works from file:// and from the dashboard.
 * Charts are plain HTML bars so segment gaps, rounded data-ends and labels are exact.
 */
export function renderReportHtml(summary: RunSummary): string {
  const data = JSON.stringify(summary).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NAT run ${escapeHtml(summary.meta.id)}</title>
<style>
${REPORT_CSS}
</style>
</head>
<body>
<div class="viz-root">
  <header class="top">
    <div>
      <div class="eyebrow">NAT · Playwright run report</div>
      <h1 id="run-title"></h1>
      <div class="sub" id="run-sub"></div>
    </div>
    <nav class="links" id="links"></nav>
  </header>

  <section class="kpis" id="kpis" aria-label="Run totals"></section>

  <section class="card">
    <div class="card-head">
      <h2>Outcome by file</h2>
      <div class="legend" id="legend-files"></div>
    </div>
    <div class="rows" id="chart-files"></div>
  </section>

  <div class="two">
    <section class="card">
      <div class="card-head">
        <h2>Outcome by project</h2>
        <div class="legend" id="legend-projects"></div>
      </div>
      <div class="rows" id="chart-projects"></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Duration by file</h2><div class="hint">wall time of tests in the file</div></div>
      <div class="rows" id="chart-duration"></div>
    </section>
  </div>

  <section class="card" id="failures-card">
    <div class="card-head"><h2>Failures</h2><div class="hint" id="failures-hint"></div></div>
    <div id="failures"></div>
  </section>

  <div class="two">
    <section class="card">
      <div class="card-head"><h2>Slowest tests</h2></div>
      <div class="table-wrap"><table id="slowest"></table></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Selection</h2></div>
      <dl class="kv" id="selection"></dl>
    </section>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>All tests</h2>
      <div class="filters" id="table-filters" role="group" aria-label="Filter by outcome"></div>
    </div>
    <div class="table-wrap"><table id="all-tests"></table></div>
  </section>

  <div class="tooltip" id="tooltip" role="tooltip" hidden></div>
</div>
<script type="application/json" id="nat-data">${data}</script>
<script>
${REPORT_JS}
</script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const REPORT_CSS = `
:root { color-scheme: light; }
.viz-root {
  --surface-1: #fcfcfb; --page: #f9f9f7;
  --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --border: rgba(11,11,11,0.10);
  --good: #0ca30c; --critical: #d03b3b; --warning: #fab219; --neutral: #898781;
  --series-1: #2a78d6; --series-1-soft: #b7d3f6;
  --good-text: #006300;
  color: var(--ink); background: var(--page);
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  min-height: 100vh; padding: 24px clamp(16px, 4vw, 40px) 48px; box-sizing: border-box;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) .viz-root {
    color-scheme: dark;
    --surface-1: #1a1a19; --page: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,0.10);
    --series-1: #3987e5; --series-1-soft: #1c5cab; --good-text: #0ca30c;
  }
}
:root[data-theme="dark"] .viz-root {
  color-scheme: dark;
  --surface-1: #1a1a19; --page: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,0.10);
  --series-1: #3987e5; --series-1-soft: #1c5cab; --good-text: #0ca30c;
}
body { margin: 0; background: var(--page); }
h1 { font-size: 22px; margin: 2px 0 4px; font-weight: 600; }
h2 { font-size: 15px; margin: 0; font-weight: 600; }
.eyebrow { color: var(--muted); font-size: 12px; letter-spacing: .02em; text-transform: uppercase; }
.sub { color: var(--ink-2); }
.top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 20px; }
.links a { display: inline-block; margin-left: 12px; color: var(--series-1); text-decoration: none; border-bottom: 1px solid var(--border); }
.links a:hover { border-color: var(--series-1); }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
.tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
.tile .lbl { color: var(--ink-2); font-size: 12px; }
.tile .val { font-size: 28px; font-weight: 600; margin-top: 2px; display: flex; align-items: baseline; gap: 8px; }
.tile.hero .val { font-size: 48px; line-height: 1; }
.tile .val .ic { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.hint { color: var(--muted); font-size: 12px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 860px) { .two { grid-template-columns: 1fr; } }
.legend { display: flex; gap: 14px; flex-wrap: wrap; color: var(--ink-2); font-size: 12px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.rows { display: grid; gap: 8px; }
.row { display: grid; grid-template-columns: minmax(120px, 34%) 1fr 56px; align-items: center; gap: 12px; }
.row .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-2); font-size: 13px; }
.row .val { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink-2); font-size: 13px; }
.bar { display: flex; gap: 2px; height: 18px; align-items: stretch; }
.seg { position: relative; display: flex; align-items: center; justify-content: center; min-width: 3px; color: #fff; font-size: 11px; font-variant-numeric: tabular-nums; cursor: default; transition: filter .12s; }
.seg:last-child { border-radius: 0 4px 4px 0; }
.seg:hover, .seg:focus-visible { filter: brightness(1.12); outline: 2px solid var(--surface-1); outline-offset: -2px; }
.seg[data-k="passed"] { background: var(--good); }
.seg[data-k="failed"] { background: var(--critical); }
.seg[data-k="flaky"] { background: var(--warning); color: #0b0b0b; }
.seg[data-k="skipped"] { background: var(--neutral); }
.seg .n { pointer-events: none; }
.dur { height: 18px; background: var(--series-1); border-radius: 0 4px 4px 0; min-width: 2px; transition: filter .12s; }
.dur:hover { filter: brightness(1.12); }
.track { height: 18px; border-bottom: 1px solid var(--grid); display: flex; align-items: center; }
.empty { color: var(--muted); padding: 8px 0; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--grid); vertical-align: top; }
th { color: var(--muted); font-weight: 500; font-size: 12px; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--ink-2); }
.status { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.status i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.st-passed i { background: var(--good); } .st-failed i { background: var(--critical); }
.st-flaky i { background: var(--warning); } .st-skipped i { background: var(--neutral); }
.fail { border-left: 3px solid var(--critical); padding: 8px 12px; margin-bottom: 10px; background: color-mix(in srgb, var(--critical) 6%, var(--surface-1)); border-radius: 0 6px 6px 0; }
.fail .t { font-weight: 600; }
.fail .w { color: var(--ink-2); font-size: 12px; margin: 2px 0 6px; }
.fail pre { margin: 0; white-space: pre-wrap; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--ink-2); }
.kv { display: grid; grid-template-columns: 120px 1fr; gap: 6px 12px; margin: 0; font-size: 13px; }
.kv dt { color: var(--muted); } .kv dd { margin: 0; overflow-wrap: anywhere; }
.filters button { background: transparent; border: 1px solid var(--border); color: var(--ink-2); border-radius: 999px; padding: 3px 10px; margin-left: 6px; font: inherit; font-size: 12px; cursor: pointer; }
.filters button[aria-pressed="true"] { border-color: var(--series-1); color: var(--ink); background: color-mix(in srgb, var(--series-1) 10%, transparent); }
.tooltip { position: fixed; z-index: 10; pointer-events: none; background: var(--ink); color: var(--surface-1); padding: 8px 10px; border-radius: 6px; font-size: 12px; max-width: 320px; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
.tooltip .tt-title { font-weight: 600; margin-bottom: 4px; overflow-wrap: anywhere; }
.tooltip .tt-row { display: flex; gap: 8px; align-items: center; }
.tooltip .tt-row b { font-variant-numeric: tabular-nums; min-width: 28px; text-align: right; }
.tooltip .tt-row i { width: 12px; height: 2px; display: inline-block; }
`;

const REPORT_JS = `
(function () {
  var S = JSON.parse(document.getElementById('nat-data').textContent);
  var KEYS = ['passed', 'failed', 'flaky', 'skipped'];
  var LABEL = { passed: 'Passed', failed: 'Failed', flaky: 'Flaky', skipped: 'Skipped' };
  var ICON = { passed: '\\u2713', failed: '\\u2715', flaky: '\\u21BB', skipped: '\\u2013' };
  var COLOR = { passed: 'var(--good)', failed: 'var(--critical)', flaky: 'var(--warning)', skipped: 'var(--neutral)' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fmtMs(ms) {
    if (ms < 1000) return Math.round(ms) + ' ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
    var m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function statusCell(k) {
    var s = el('span', 'status st-' + k);
    s.appendChild(el('i'));
    s.appendChild(el('span', null, ICON[k] + ' ' + LABEL[k]));
    return s;
  }

  // Header
  document.getElementById('run-title').textContent = 'Run ' + S.meta.id;
  var subParts = ['Started ' + fmtDate(S.meta.startedAt), 'Duration ' + fmtMs(S.durationMs)];
  if (S.meta.stopped) subParts.push('Stopped by user');
  else if (S.meta.exitCode !== undefined && S.meta.exitCode !== null) subParts.push('Exit code ' + S.meta.exitCode);
  document.getElementById('run-sub').textContent = subParts.join(' \\u00B7 ');
  if (S.hasNativeReport) {
    var a = el('a', null, 'Playwright HTML report (traces, screenshots)');
    a.href = 'html/index.html';
    document.getElementById('links').appendChild(a);
  }

  // KPI row
  var kpis = document.getElementById('kpis');
  var hero = el('div', 'tile hero');
  hero.appendChild(el('div', 'lbl', 'Pass rate (excl. skipped)'));
  var hv = el('div', 'val', S.totals.passRate === null ? '\\u2014' : S.totals.passRate + '%');
  hero.appendChild(hv);
  kpis.appendChild(hero);
  [['Total tests', S.totals.total, null], ['Passed', S.totals.passed, 'passed'], ['Failed', S.totals.failed, 'failed'],
   ['Flaky', S.totals.flaky, 'flaky'], ['Skipped', S.totals.skipped, 'skipped'], ['Duration', fmtMs(S.durationMs), null]]
  .forEach(function (t) {
    var tile = el('div', 'tile');
    tile.appendChild(el('div', 'lbl', t[0]));
    var v = el('div', 'val');
    if (t[2]) { var ic = el('span', 'ic'); ic.style.background = COLOR[t[2]]; v.appendChild(ic); }
    v.appendChild(el('span', null, String(t[1])));
    tile.appendChild(v);
    kpis.appendChild(tile);
  });

  // Legend (always present: 4 status series)
  function legend(target) {
    KEYS.forEach(function (k) {
      var s = el('span');
      var i = el('i'); i.style.background = COLOR[k];
      s.appendChild(i);
      s.appendChild(el('span', null, ICON[k] + ' ' + LABEL[k]));
      target.appendChild(s);
    });
  }
  legend(document.getElementById('legend-files'));
  legend(document.getElementById('legend-projects'));

  // Tooltip
  var tip = document.getElementById('tooltip');
  function showTip(title, rows, x, y) {
    tip.textContent = '';
    tip.appendChild(el('div', 'tt-title', title));
    rows.forEach(function (r) {
      var row = el('div', 'tt-row');
      var i = el('i'); i.style.background = r.color || 'transparent';
      row.appendChild(i);
      row.appendChild(el('b', null, r.value));
      row.appendChild(el('span', null, r.label));
      tip.appendChild(row);
    });
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(x + 12, window.innerWidth - w - 8);
    var top = y + 14 + h > window.innerHeight ? y - h - 10 : y + 14;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.hidden = true; }
  function attachTip(node, title, rowsFn) {
    node.addEventListener('pointermove', function (e) { showTip(title, rowsFn(), e.clientX, e.clientY); });
    node.addEventListener('pointerleave', hideTip);
    node.tabIndex = 0;
    node.addEventListener('focus', function () { var r = node.getBoundingClientRect(); showTip(title, rowsFn(), r.left, r.bottom); });
    node.addEventListener('blur', hideTip);
  }

  // Stacked outcome rows
  function stacked(target, buckets) {
    target.textContent = '';
    if (!buckets.length) { target.appendChild(el('div', 'empty', 'No tests in this run.')); return; }
    var max = 0;
    buckets.forEach(function (b) { max = Math.max(max, b.passed + b.failed + b.flaky + b.skipped); });
    buckets.forEach(function (b) {
      var total = b.passed + b.failed + b.flaky + b.skipped;
      var row = el('div', 'row');
      var lbl = el('div', 'lbl', b.key); lbl.title = b.key;
      row.appendChild(lbl);
      var track = el('div', 'track');
      var bar = el('div', 'bar');
      bar.style.width = (total / max * 100) + '%';
      var rows = function () {
        return KEYS.map(function (k) { return { label: LABEL[k], value: String(b[k]), color: COLOR[k] }; });
      };
      KEYS.forEach(function (k) {
        if (!b[k]) return;
        var seg = el('div', 'seg');
        seg.dataset.k = k;
        seg.style.flex = b[k] + ' 0 0';
        seg.setAttribute('aria-label', LABEL[k] + ' ' + b[k]);
        seg.appendChild(el('span', 'n', String(b[k])));
        attachTip(seg, b.key, rows);
        bar.appendChild(seg);
      });
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('div', 'val', String(total)));
      target.appendChild(row);
    });
    // Direct labels only where they fit; the legend, tooltip and table carry the rest.
    requestAnimationFrame(function () {
      target.querySelectorAll('.seg').forEach(function (seg) {
        var n = seg.firstChild;
        if (seg.clientWidth < n.offsetWidth + 10) n.style.visibility = 'hidden';
      });
    });
  }
  stacked(document.getElementById('chart-files'), S.byFile);
  stacked(document.getElementById('chart-projects'), S.byProject);

  // Duration bars (single hue, sorted)
  (function () {
    var target = document.getElementById('chart-duration');
    var items = S.byFile.slice().sort(function (a, b) { return b.durationMs - a.durationMs; }).slice(0, 15);
    if (!items.length) { target.appendChild(el('div', 'empty', 'No tests in this run.')); return; }
    var max = items[0].durationMs || 1;
    items.forEach(function (b) {
      var row = el('div', 'row');
      var lbl = el('div', 'lbl', b.key); lbl.title = b.key;
      row.appendChild(lbl);
      var track = el('div', 'track');
      var bar = el('div', 'dur');
      bar.style.width = Math.max(0.5, b.durationMs / max * 100) + '%';
      attachTip(bar, b.key, function () { return [{ label: 'total test time', value: fmtMs(b.durationMs), color: 'var(--series-1)' }]; });
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('div', 'val', fmtMs(b.durationMs)));
      target.appendChild(row);
    });
  })();

  // Failures
  (function () {
    var target = document.getElementById('failures');
    var hint = document.getElementById('failures-hint');
    if (!S.failures.length) {
      hint.textContent = 'none';
      target.appendChild(el('div', 'empty', 'No failed tests.'));
      return;
    }
    hint.textContent = S.failures.length + ' failed';
    S.failures.forEach(function (f) {
      var box = el('div', 'fail');
      box.appendChild(el('div', 't', f.title));
      box.appendChild(el('div', 'w', '[' + f.project + '] ' + f.file + ':' + f.line + ' \\u00B7 ' + fmtMs(f.durationMs)));
      if (f.error) box.appendChild(el('pre', null, f.error));
      target.appendChild(box);
    });
  })();

  // Slowest
  (function () {
    var table = document.getElementById('slowest');
    var thead = el('thead'); var tr = el('tr');
    ['Test', 'Project', 'Outcome', 'Duration'].forEach(function (h, i) { tr.appendChild(el('th', i === 3 ? 'num' : null, h)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = el('tbody');
    if (!S.slowest.length) { var td = el('td', 'empty', 'No tests ran.'); td.colSpan = 4; var r = el('tr'); r.appendChild(td); tbody.appendChild(r); }
    S.slowest.forEach(function (t) {
      var r = el('tr');
      var c = el('td'); c.appendChild(el('div', null, t.title)); c.appendChild(el('div', 'hint', t.file + ':' + t.line)); r.appendChild(c);
      r.appendChild(el('td', 'mono', t.project));
      var sc = el('td'); sc.appendChild(statusCell(t.status)); r.appendChild(sc);
      r.appendChild(el('td', 'num', fmtMs(t.durationMs)));
      tbody.appendChild(r);
    });
    table.appendChild(tbody);
  })();

  // Selection
  (function () {
    var dl = document.getElementById('selection');
    var sel = S.meta.selection;
    var targets = sel.files.concat(sel.locations);
    [['Projects', sel.projects.length ? sel.projects.join(', ') : 'config default'],
     ['Workers', sel.workers === null ? 'Playwright default' : String(sel.workers)],
     ['Grep', sel.grep || '\\u2014'],
     ['Targets', targets.length ? targets.join('\\n') : 'all tests']]
    .forEach(function (kv) {
      dl.appendChild(el('dt', null, kv[0]));
      var dd = el('dd', null, kv[1]); dd.style.whiteSpace = 'pre-line';
      dl.appendChild(dd);
    });
  })();

  // All tests (table view with outcome filter)
  (function () {
    var table = document.getElementById('all-tests');
    var filters = document.getElementById('table-filters');
    var active = 'all';
    function render() {
      table.textContent = '';
      var thead = el('thead'); var tr = el('tr');
      ['Outcome', 'Test', 'File', 'Project', 'Duration'].forEach(function (h, i) { tr.appendChild(el('th', i === 4 ? 'num' : null, h)); });
      thead.appendChild(tr); table.appendChild(thead);
      var tbody = el('tbody');
      var rows = S.tests.filter(function (t) { return active === 'all' || t.status === active; });
      if (!rows.length) { var td = el('td', 'empty', 'Nothing to show.'); td.colSpan = 5; var r0 = el('tr'); r0.appendChild(td); tbody.appendChild(r0); }
      rows.forEach(function (t) {
        var r = el('tr');
        var sc = el('td'); sc.appendChild(statusCell(t.status)); r.appendChild(sc);
        r.appendChild(el('td', null, t.title));
        r.appendChild(el('td', 'mono', t.file + ':' + t.line));
        r.appendChild(el('td', 'mono', t.project));
        r.appendChild(el('td', 'num', fmtMs(t.durationMs)));
        tbody.appendChild(r);
      });
      table.appendChild(tbody);
    }
    [['all', 'All (' + S.totals.total + ')']].concat(KEYS.map(function (k) { return [k, ICON[k] + ' ' + LABEL[k] + ' (' + S.totals[k] + ')']; }))
    .forEach(function (f) {
      var b = el('button', null, f[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', f[0] === active ? 'true' : 'false');
      b.addEventListener('click', function () {
        active = f[0];
        filters.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        render();
      });
      filters.appendChild(b);
    });
    render();
  })();
})();
`;
