/* Overview tab: charts built only from run summaries (.nat/runs/<id>/summary.json) and the live test inventory. */
window.NATOverview = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['passed', 'failed', 'flaky', 'skipped'];
  var LABEL = { passed: 'Passed', failed: 'Failed', flaky: 'Flaky', skipped: 'Skipped' };
  var ICON = { passed: '✓', failed: '✕', flaky: '↻', skipped: '–' };
  var COLOR = { passed: 'var(--good)', failed: 'var(--critical)', flaky: 'var(--warning)', skipped: 'var(--neutral)' };
  // Fixed slot order; green and red are left out so an area never reads as passed/failed.
  var AREA_COLORS = [1, 2, 3, 4, 5, 6].map(function (i) { return 'var(--cat-' + i + ')'; });
  var AREA_DARK_TEXT = { 2: true, 3: true, 4: true };
  var AREA_OTHER = 'var(--muted)';
  var TREND_RUNS = 20;
  var MATRIX_RUNS = 12;
  var MATRIX_ROWS = 40;
  var SVGNS = 'http://www.w3.org/2000/svg';

  var st = { runs: [], summaries: {}, selected: null, inventory: null };
  var api = { onOpenRun: null };

  // ---- helpers ------------------------------------------------------------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fmtMs(ms) {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return Math.round(ms) + ' ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
    var m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
    if (s === 60) { m += 1; s = 0; }
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }
  function fmtAxisMs(ms) {
    if (ms === 0) return '0';
    if (ms < 60000) return Math.round(ms / 1000) + ' s';
    var m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
    return s ? m + 'm ' + s + 's' : m + ' min';
  }
  function fmtDate(iso) { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  function fmtDay(iso) { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
  function fmtTime(iso) { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
  function loc(t) { return t.declaredIn ? t.file + ' (' + t.declaredIn + ':' + t.line + ')' : t.file + ':' + t.line; }
  function total(b) { return b.passed + b.failed + b.flaky + b.skipped; }
  function niceStep(raw) {
    if (raw <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
  }
  function timeStep(rawMs) {
    var secs = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];
    for (var i = 0; i < secs.length; i++) if (secs[i] * 1000 >= rawMs) return secs[i] * 1000;
    return niceStep(rawMs);
  }
  function areaOf(file) {
    var p = file.replace(/^tests\//, '');
    var i = p.lastIndexOf('/');
    return i === -1 ? '(root)' : p.slice(0, i);
  }
  function legendInto(target, items) {
    target.textContent = '';
    items.forEach(function (it) {
      var s = el('span');
      var i = el('i', it.none ? 'none' : null);
      if (!it.none) i.style.background = it.color;
      s.appendChild(i);
      s.appendChild(el('span', null, it.label));
      target.appendChild(s);
    });
  }
  function statusLegend(target, withNone) {
    var items = KEYS.map(function (k) { return { label: ICON[k] + ' ' + LABEL[k], color: COLOR[k] }; });
    if (withNone) items.push({ label: 'Not in run', none: true });
    legendInto(target, items);
  }

  // ---- tooltip ------------------------------------------------------------
  var tip = null;
  function showTip(title, rows, x, y) {
    tip = tip || $('tooltip');
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
    tip.style.left = Math.max(8, Math.min(x + 12, window.innerWidth - w - 8)) + 'px';
    tip.style.top = (y + 14 + h > window.innerHeight ? y - h - 10 : y + 14) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  function attachTip(node, titleFn, rowsFn, onActivate) {
    node.addEventListener('pointermove', function (e) { showTip(titleFn(), rowsFn(), e.clientX, e.clientY); });
    node.addEventListener('pointerleave', hideTip);
    node.setAttribute('tabindex', '0');
    node.addEventListener('focus', function () { var r = node.getBoundingClientRect(); showTip(titleFn(), rowsFn(), r.left, r.bottom); });
    node.addEventListener('blur', hideTip);
    if (onActivate) {
      node.addEventListener('click', onActivate);
      node.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } });
    }
  }
  function outcomeRows(b) {
    return KEYS.map(function (k) { return { label: LABEL[k], value: String(b[k]), color: COLOR[k] }; });
  }

  // ---- data ---------------------------------------------------------------
  function finished() {
    return st.runs.filter(function (r) { return !r.running && r.totals; });
  }
  function chronological(list) {
    return list.slice().sort(function (a, b) { return Date.parse(a.meta.startedAt) - Date.parse(b.meta.startedAt); });
  }
  function fetchSummary(id) {
    if (st.summaries[id]) return Promise.resolve(st.summaries[id]);
    return fetch('/api/runs/' + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      if (s) st.summaries[id] = s;
      return s;
    }).catch(function () { return null; });
  }

  function setRuns(runs, selectId) {
    st.runs = runs;
    var done = finished();
    $('ov-empty').hidden = done.length > 0;
    $('ov-body').hidden = done.length === 0;
    if (!done.length) return;

    var sel = $('ov-run');
    sel.textContent = '';
    done.forEach(function (r) {
      var parts = [r.meta.id, fmtDate(r.meta.startedAt), r.totals.total + ' tests'];
      if (r.meta.importedFrom) parts.push('imported'); else if (r.meta.selection.env) parts.push(r.meta.selection.env.name);
      var o = el('option', null, parts.join(' · '));
      o.value = r.meta.id;
      sel.appendChild(o);
    });
    var ids = done.map(function (r) { return r.meta.id; });
    var want = selectId && ids.indexOf(selectId) !== -1 ? selectId : (st.selected && ids.indexOf(st.selected) !== -1 ? st.selected : ids[0]);

    var recent = chronological(done).slice(-Math.max(TREND_RUNS, MATRIX_RUNS));
    Promise.all(recent.map(function (r) { return fetchSummary(r.meta.id); })).then(function () { select(want); });
  }

  function select(id) {
    st.selected = id;
    $('ov-run').value = id;
    fetchSummary(id).then(function (S) {
      if (!S || st.selected !== id) return;
      renderHero(S);
      renderKpis(S);
      stackedRows($('ov-files'), S.byFile);
      stackedRows($('ov-projects'), S.byProject);
      durationRows(S);
      slowestRows(S);
      failures(S);
      redraw();
    });
  }

  // ---- hero + ring --------------------------------------------------------
  function renderHero(S) {
    $('ov-title').textContent = 'Run ' + S.meta.id;
    var meta = $('ov-meta');
    meta.textContent = '';
    var sel = S.meta.selection;
    var items = [
      ['Started', fmtDate(S.meta.startedAt)],
      ['Duration', fmtMs(S.durationMs)],
      ['Environment', sel.env ? sel.env.name : (S.meta.importedFrom ? 'as recorded' : 'server default')],
      ['Projects', sel.projects.length ? sel.projects.join(', ') : 'config default'],
      ['Workers', sel.workers === null ? 'auto' : String(sel.workers)]
    ];
    if (S.meta.importedFrom) items.push(['Imported from', S.meta.importedFrom]);
    else if (S.meta.stopped) items.push(['Status', 'stopped by user']);
    else if (S.meta.exitCode !== undefined && S.meta.exitCode !== null) items.push(['Exit code', String(S.meta.exitCode)]);
    items.forEach(function (kv) {
      var s = el('span', null, kv[0] + ' ');
      s.appendChild(el('b', null, kv[1]));
      meta.appendChild(s);
    });
    var links = $('ov-links');
    links.textContent = '';
    var a = el('a', null, 'Run report'); a.href = '/runs/' + S.meta.id + '/report'; a.target = '_blank';
    links.appendChild(a);
    if (S.hasNativeReport) {
      var b = el('a', null, 'Playwright report'); b.href = '/runs/' + S.meta.id + '/html/index.html'; b.target = '_blank';
      links.appendChild(b);
    }
    var c = el('a', null, 'Log'); c.href = '/runs/' + S.meta.id + '/log'; c.target = '_blank';
    links.appendChild(c);
    ring(S.totals);
  }

  function ring(t) {
    var size = 132, stroke = 14, r = (size - stroke) / 2, C = 2 * Math.PI * r, gap = 2;
    var host = $('ov-ring');
    host.textContent = '';
    var s = svg('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, role: 'img',
      'aria-label': 'Pass rate ' + (t.passRate === null ? 'not available' : t.passRate + '%') });
    s.appendChild(svg('circle', { cx: size / 2, cy: size / 2, r: r, fill: 'none', stroke: 'var(--grid)', 'stroke-width': stroke }));
    var n = t.total || 0;
    var parts = KEYS.filter(function (k) { return t[k] > 0; });
    var offset = 0;
    parts.forEach(function (k) {
      var len = t[k] / n * C;
      var drawn = parts.length > 1 ? Math.max(0.5, len - gap) : len;
      var c = svg('circle', {
        cx: size / 2, cy: size / 2, r: r, fill: 'none', stroke: COLOR[k], 'stroke-width': stroke,
        'stroke-dasharray': drawn + ' ' + (C - drawn), 'stroke-dashoffset': -offset,
        transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'
      });
      offset += len;
      s.appendChild(c);
    });
    s.appendChild(svg('text', { x: size / 2, y: size / 2 + 4, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 26, 'font-weight': 650 },
      t.passRate === null ? '—' : (t.passRate % 1 === 0 ? t.passRate : t.passRate.toFixed(1)) + '%'));
    s.appendChild(svg('text', { x: size / 2, y: size / 2 + 22, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, 'pass rate'));
    host.appendChild(s);

    var lg = $('ov-ring-legend');
    lg.textContent = '';
    KEYS.forEach(function (k) {
      var row = el('span');
      var i = el('i'); i.style.background = COLOR[k];
      row.appendChild(i);
      row.appendChild(el('b', null, String(t[k])));
      row.appendChild(el('span', null, ICON[k] + ' ' + LABEL[k]));
      lg.appendChild(row);
    });
  }

  function renderKpis(S) {
    var t = S.totals;
    var ran = t.total - t.skipped;
    var testTime = S.tests.reduce(function (a, x) { return a + (x.status === 'skipped' ? 0 : x.durationMs); }, 0);
    var tiles = [
      ['Tests', String(t.total), null, S.byFile.length + ' files'],
      ['Passed', String(t.passed), 'passed', ran ? 'of ' + ran + ' that ran' : 'nothing ran'],
      ['Failed', String(t.failed), 'failed', t.failed ? S.failures.length + ' with errors' : 'none'],
      ['Flaky', String(t.flaky), 'flaky', 'passed on retry'],
      ['Skipped', String(t.skipped), 'skipped', 'fixme / skip'],
      ['Wall time', fmtMs(S.durationMs), null, 'whole run'],
      ['Avg test', ran ? fmtMs(testTime / ran) : '—', null, 'per test that ran']
    ];
    var host = $('ov-kpis');
    host.textContent = '';
    tiles.forEach(function (x) {
      var tile = el('div', 'tile');
      var lbl = el('div', 'lbl');
      if (x[2]) { var i = el('i'); i.style.background = COLOR[x[2]]; lbl.appendChild(i); }
      lbl.appendChild(el('span', null, x[0]));
      tile.appendChild(lbl);
      tile.appendChild(el('div', 'val', x[1]));
      tile.appendChild(el('div', 'foot', x[3]));
      host.appendChild(tile);
    });
  }

  // ---- run-over-run charts (SVG, sized to the container) -------------------
  function trendRuns() {
    return chronological(finished()).slice(-TREND_RUNS);
  }

  function frame(host, height, yMax, yStep, fmtTick) {
    host.textContent = '';
    var W = host.clientWidth;
    if (!W) return null;
    var m = { l: 44, r: 8, t: 18, b: 36 };
    var s = svg('svg', { width: W, height: height, viewBox: '0 0 ' + W + ' ' + height });
    var ih = height - m.t - m.b;
    var y = function (v) { return m.t + ih - (v / yMax) * ih; };
    for (var v = 0; v <= yMax + 1e-9; v += yStep) {
      var yy = Math.round(y(v)) + 0.5;
      s.appendChild(svg('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: v === 0 ? 'baseline' : 'gridline' }));
      s.appendChild(svg('text', { x: m.l - 8, y: yy + 4, 'text-anchor': 'end' }, fmtTick(v)));
    }
    host.appendChild(s);
    return { svg: s, W: W, H: height, m: m, y: y, iw: W - m.l - m.r, ih: ih };
  }

  function xLabels(f, runs, band, x0) {
    var every = Math.max(1, Math.ceil(46 / band));
    runs.forEach(function (r, i) {
      if (i % every !== 0 && i !== runs.length - 1) return;
      var cx = x0(i) + band / 2;
      f.svg.appendChild(svg('text', { x: cx, y: f.H - f.m.b + 16, 'text-anchor': 'middle' }, fmtDay(r.meta.startedAt)));
      f.svg.appendChild(svg('text', { x: cx, y: f.H - f.m.b + 29, 'text-anchor': 'middle' }, fmtTime(r.meta.startedAt)));
    });
  }

  function topRounded(x, y, w, h, rad) {
    rad = Math.min(rad, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + rad) + 'Q' + x + ',' + y + ' ' + (x + rad) + ',' + y +
      'H' + (x + w - rad) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + rad) + 'V' + (y + h) + 'Z';
  }

  function runTitle(r) { return 'Run ' + r.meta.id + ' · ' + fmtDate(r.meta.startedAt); }
  function openRun(id) { return function () { select(id); window.scrollTo({ top: 0, behavior: 'smooth' }); if (api.onOpenRun) api.onOpenRun(id); }; }

  function trendChart() {
    var host = $('ov-trend');
    var runs = trendRuns();
    $('ov-trend-hint').textContent = '· last ' + runs.length + (runs.length === 1 ? ' run' : ' runs');
    var max = 0;
    runs.forEach(function (r) { max = Math.max(max, r.totals.total); });
    var step = Math.max(1, niceStep(max / 4));
    var yMax = Math.max(step, Math.ceil(max / step) * step);
    var f = frame(host, 220, yMax, step, function (v) { return String(v); });
    if (!f) return;
    var band = f.iw / runs.length;
    var bw = Math.max(6, Math.min(44, band * 0.6));
    var x0 = function (i) { return f.m.l + i * band; };
    runs.forEach(function (r, i) {
      var g = svg('g', { class: 'col' + (r.meta.id === st.selected ? ' sel' : ' dim') });
      var bx = x0(i) + (band - bw) / 2;
      var base = f.y(0);
      var present = KEYS.filter(function (k) { return r.totals[k] > 0; });
      present.forEach(function (k, j) {
        var h = (r.totals[k] / yMax) * f.ih;
        var top = base - h;
        var drawH = j < present.length - 1 ? Math.max(1, h - 2) : h;
        var node = j === present.length - 1
          ? svg('path', { d: topRounded(bx, top, bw, drawH, 4), fill: COLOR[k] })
          : svg('rect', { x: bx, y: top + (h - drawH), width: bw, height: drawH, fill: COLOR[k] });
        g.appendChild(node);
        base = top;
      });
      if (r.meta.id === st.selected) {
        g.appendChild(svg('text', { x: bx + bw / 2, y: base - 6, 'text-anchor': 'middle', class: 'strong' }, String(r.totals.total)));
      }
      f.svg.appendChild(g);
      var hit = svg('rect', { x: x0(i), y: f.m.t, width: band, height: f.ih, class: 'hit', 'aria-label': runTitle(r) });
      attachTip(hit, function () { return runTitle(r); }, function () {
        return outcomeRows(r.totals).concat([{ label: 'pass rate', value: r.totals.passRate === null ? '—' : r.totals.passRate + '%' }]);
      }, openRun(r.meta.id));
      f.svg.appendChild(hit);
    });
    xLabels(f, runs, band, x0);
  }

  function rateChart() {
    var host = $('ov-rate');
    var runs = trendRuns();
    var f = frame(host, 200, 100, 25, function (v) { return v + '%'; });
    if (!f) return;
    var band = f.iw / runs.length;
    var x0 = function (i) { return f.m.l + i * band; };
    var cx = function (i) { return x0(i) + band / 2; };
    var d = '', pen = false;
    runs.forEach(function (r, i) {
      var p = r.totals.passRate;
      if (p === null) { pen = false; return; }
      d += (pen ? 'L' : 'M') + cx(i) + ',' + f.y(p);
      pen = true;
    });
    if (d) f.svg.appendChild(svg('path', { d: d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    runs.forEach(function (r, i) {
      var p = r.totals.passRate;
      var selected = r.meta.id === st.selected;
      if (p !== null) {
        f.svg.appendChild(svg('circle', { cx: cx(i), cy: f.y(p), r: selected ? 6 : 4, fill: 'var(--accent)', stroke: 'var(--surface-1)', 'stroke-width': 2 }));
        if (selected) f.svg.appendChild(svg('text', { x: cx(i), y: f.y(p) - 10, 'text-anchor': 'middle', class: 'strong' }, p + '%'));
      }
      var hit = svg('rect', { x: x0(i), y: f.m.t, width: band, height: f.ih, class: 'hit', 'aria-label': runTitle(r) });
      attachTip(hit, function () { return runTitle(r); }, function () {
        return [{ label: 'pass rate', value: p === null ? '—' : p + '%', color: 'var(--accent)' },
          { label: 'passed of ran', value: r.totals.passed + r.totals.flaky + '/' + (r.totals.total - r.totals.skipped) }];
      }, openRun(r.meta.id));
      f.svg.appendChild(hit);
    });
    xLabels(f, runs, band, x0);
  }

  function durationChart() {
    var host = $('ov-dur');
    var runs = trendRuns();
    var max = 0;
    runs.forEach(function (r) { max = Math.max(max, r.durationMs || 0); });
    var step = timeStep(Math.max(1000, max / 4));
    var yMax = Math.max(step, Math.ceil(max / step) * step);
    var f = frame(host, 200, yMax, step, fmtAxisMs);
    if (!f) return;
    var band = f.iw / runs.length;
    var bw = Math.max(6, Math.min(44, band * 0.6));
    var x0 = function (i) { return f.m.l + i * band; };
    runs.forEach(function (r, i) {
      var v = r.durationMs || 0;
      var h = Math.max(1, (v / yMax) * f.ih);
      var bx = x0(i) + (band - bw) / 2;
      var selected = r.meta.id === st.selected;
      var g = svg('g', { class: 'col' + (selected ? ' sel' : ' dim') });
      g.appendChild(svg('path', { d: topRounded(bx, f.y(0) - h, bw, h, 4), fill: 'var(--accent)' }));
      if (selected) g.appendChild(svg('text', { x: bx + bw / 2, y: f.y(0) - h - 6, 'text-anchor': 'middle', class: 'strong' }, fmtMs(v)));
      f.svg.appendChild(g);
      var hit = svg('rect', { x: x0(i), y: f.m.t, width: band, height: f.ih, class: 'hit', 'aria-label': runTitle(r) });
      attachTip(hit, function () { return runTitle(r); }, function () {
        return [{ label: 'wall time', value: fmtMs(v), color: 'var(--accent)' }, { label: 'tests', value: String(r.totals.total) }];
      }, openRun(r.meta.id));
      f.svg.appendChild(hit);
    });
    xLabels(f, runs, band, x0);
  }

  // ---- stability matrix (HTML grid: file rows × run columns) --------------
  function matrix() {
    var host = $('ov-matrix');
    host.textContent = '';
    var runs = chronological(finished()).slice(-MATRIX_RUNS).filter(function (r) { return st.summaries[r.meta.id]; });
    var files = {};
    runs.forEach(function (r) { st.summaries[r.meta.id].byFile.forEach(function (b) { files[b.key] = true; }); });
    var keys = Object.keys(files).sort();
    var shown = keys.slice(0, MATRIX_ROWS);
    $('ov-matrix-hint').textContent = '· ' + keys.length + ' files × ' + runs.length + ' runs' + (keys.length > shown.length ? ' (first ' + shown.length + ' shown)' : '');
    if (!runs.length || !keys.length) { host.appendChild(el('div', 'empty', 'No per-file results yet.')); return; }

    var grid = el('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'minmax(180px, 440px) repeat(' + runs.length + ', 44px)';
    grid.style.justifyContent = 'start';
    grid.style.gap = '2px';
    grid.style.alignItems = 'center';

    grid.appendChild(el('div'));
    runs.forEach(function (r) {
      var sel = r.meta.id === st.selected;
      var h = el('div', 'hint');
      h.appendChild(el('div', null, fmtDay(r.meta.startedAt)));
      h.appendChild(el('div', null, fmtTime(r.meta.startedAt)));
      h.style.cssText = 'text-align: center; font-size: 10.5px; line-height: 1.25; padding-bottom: 4px; border-bottom: 2px solid ' +
        (sel ? 'var(--accent)' : 'transparent') + ';' + (sel ? 'color: var(--ink); font-weight: 700;' : '');
      h.title = runTitle(r);
      grid.appendChild(h);
    });
    shown.forEach(function (file) {
      var lbl = el('div', null, file);
      lbl.style.cssText = 'font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px;';
      lbl.title = file;
      grid.appendChild(lbl);
      runs.forEach(function (r) {
        var b = null;
        st.summaries[r.meta.id].byFile.forEach(function (x) { if (x.key === file) b = x; });
        var k = !b ? null : b.failed ? 'failed' : b.flaky ? 'flaky' : b.passed ? 'passed' : 'skipped';
        var cell = el('div');
        cell.style.cssText = 'height: 18px; border-radius: 3px; cursor: pointer;';
        if (k) cell.style.background = COLOR[k];
        else cell.style.boxShadow = 'inset 0 0 0 1px var(--grid)';
        cell.setAttribute('aria-label', file + ', ' + runTitle(r) + ': ' + (k ? LABEL[k] : 'not in run'));
        attachTip(cell, function () { return file; }, function () {
          var head = [{ label: runTitle(r), value: '' }];
          return b ? head.concat(outcomeRows(b)) : head.concat([{ label: 'not part of this run', value: '' }]);
        }, openRun(r.meta.id));
        grid.appendChild(cell);
      });
    });
    host.appendChild(grid);
  }

  // ---- per-run bar rows (HTML) --------------------------------------------
  function stackedRows(target, buckets) {
    target.textContent = '';
    if (!buckets.length) { target.appendChild(el('div', 'empty', 'No tests in this run.')); return; }
    var max = 0;
    buckets.forEach(function (b) { max = Math.max(max, total(b)); });
    buckets.forEach(function (b) {
      var row = el('div', 'row');
      var lbl = el('div', 'lbl', b.key); lbl.title = b.key;
      row.appendChild(lbl);
      var track = el('div', 'track');
      var bar = el('div', 'bar');
      bar.style.width = (total(b) / max * 100) + '%';
      KEYS.forEach(function (k) {
        if (!b[k]) return;
        var seg = el('div', 'seg');
        seg.dataset.k = k;
        seg.style.flex = b[k] + ' 0 0';
        seg.setAttribute('aria-label', b.key + ': ' + LABEL[k] + ' ' + b[k]);
        seg.appendChild(el('span', 'n', String(b[k])));
        attachTip(seg, function () { return b.key; }, function () { return outcomeRows(b); });
        bar.appendChild(seg);
      });
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('div', 'val', String(total(b))));
      target.appendChild(row);
    });
    requestAnimationFrame(function () {
      target.querySelectorAll('.seg').forEach(function (seg) {
        var n = seg.firstChild;
        if (seg.clientWidth < n.offsetWidth + 10) n.style.visibility = 'hidden';
      });
    });
  }

  function valueRows(target, items, fmt, emptyText) {
    target.textContent = '';
    if (!items.length) { target.appendChild(el('div', 'empty', emptyText)); return; }
    var max = 0;
    items.forEach(function (x) { max = Math.max(max, x.value); });
    items.forEach(function (x) {
      var row = el('div', 'row');
      var lbl = el('div', 'lbl', x.label); lbl.title = x.title || x.label;
      row.appendChild(lbl);
      var track = el('div', 'track');
      var bar = el('div', 'dur');
      bar.style.width = Math.max(0.5, (max ? x.value / max : 0) * 100) + '%';
      bar.setAttribute('aria-label', x.label + ': ' + fmt(x.value));
      attachTip(bar, function () { return x.title || x.label; }, function () { return x.rows || [{ label: '', value: fmt(x.value), color: 'var(--accent)' }]; });
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('div', 'val', fmt(x.value)));
      target.appendChild(row);
    });
  }

  function durationRows(S) {
    var items = S.byFile.slice().sort(function (a, b) { return b.durationMs - a.durationMs; }).slice(0, 12)
      .map(function (b) { return { label: b.key, value: b.durationMs, rows: [{ label: 'test time', value: fmtMs(b.durationMs), color: 'var(--accent)' }, { label: 'tests', value: String(total(b)) }] }; });
    valueRows($('ov-files-dur'), items, fmtMs, 'No tests in this run.');
  }

  function slowestRows(S) {
    var items = S.slowest.map(function (t) {
      return {
        label: t.title.split(' › ').pop(),
        title: t.title,
        value: t.durationMs,
        rows: [{ label: loc(t), value: '' }, { label: t.project, value: fmtMs(t.durationMs), color: 'var(--accent)' },
          { label: LABEL[t.status], value: ICON[t.status], color: COLOR[t.status] }]
      };
    });
    valueRows($('ov-slowest'), items, fmtMs, 'No tests ran.');
  }

  function failures(S) {
    var host = $('ov-failures');
    host.textContent = '';
    $('ov-fail-hint').textContent = S.failures.length ? S.failures.length + ' failed' : '';
    if (!S.failures.length) {
      var ok = el('div', 'allgood');
      ok.appendChild(el('i', null, '✓'));
      ok.appendChild(el('span', null, S.totals.total ? 'No failed tests in this run' : 'Nothing ran'));
      host.appendChild(ok);
      return;
    }
    S.failures.slice(0, 8).forEach(function (f) {
      var box = el('div', 'fail');
      box.appendChild(el('div', 't', f.title));
      box.appendChild(el('div', 'w', '[' + f.project + '] ' + loc(f) + ' · ' + fmtMs(f.durationMs)));
      if (f.error) box.appendChild(el('pre', null, f.error));
      host.appendChild(box);
    });
    if (S.failures.length > 8) host.appendChild(el('div', 'hint', '+' + (S.failures.length - 8) + ' more in the run report'));
  }

  // ---- inventory ----------------------------------------------------------
  function setInventory(inv) {
    st.inventory = inv;
    var tagCount = {}, projCount = {};
    inv.files.forEach(function (f) {
      f.specs.forEach(function (s) {
        s.tags.forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
        s.projects.forEach(function (p) { projCount[p] = (projCount[p] || 0) + 1; });
      });
    });
    $('ov-inv-hint').textContent = '· ' + inv.total + ' tests in ' + inv.files.length + ' files · from playwright --list';
    valueRows($('ov-inv-projects'), Object.keys(projCount).sort().map(function (p) { return { label: p, value: projCount[p] }; }),
      function (v) { return String(v); }, 'No projects.');
    valueRows($('ov-inv-tags'), Object.keys(tagCount).sort(function (a, b) { return tagCount[b] - tagCount[a]; }).slice(0, 10)
      .map(function (t) { return { label: t, value: tagCount[t] }; }), function (v) { return String(v); }, 'No tagged tests.');
    treemap();
  }

  function squarify(nodes, rect) {
    var out = [], row = [], r = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    function worst(list, side) {
      var s = 0, mx = 0, mn = Infinity;
      list.forEach(function (n) { s += n.area; mx = Math.max(mx, n.area); mn = Math.min(mn, n.area); });
      return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn));
    }
    function place(list) {
      var s = list.reduce(function (a, n) { return a + n.area; }, 0);
      if (r.w >= r.h) {
        var cw = s / r.h, yy = r.y;
        list.forEach(function (n) { var hh = n.area / cw; out.push({ n: n, x: r.x, y: yy, w: cw, h: hh }); yy += hh; });
        r = { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h };
      } else {
        var rh = s / r.w, xx = r.x;
        list.forEach(function (n) { var ww = n.area / rh; out.push({ n: n, x: xx, y: r.y, w: ww, h: rh }); xx += ww; });
        r = { x: r.x, y: r.y + rh, w: r.w, h: r.h - rh };
      }
    }
    var i = 0;
    while (i < nodes.length) {
      var side = Math.min(r.w, r.h);
      var cand = row.concat([nodes[i]]);
      if (!row.length || worst(cand, side) <= worst(row, side)) { row = cand; i++; }
      else { place(row); row = []; }
    }
    if (row.length) place(row);
    return out;
  }

  function treemap() {
    var host = $('ov-treemap');
    host.textContent = '';
    var inv = st.inventory;
    if (!inv) return;
    var W = host.clientWidth, H = host.clientHeight;
    if (!W) return;
    var areas = {};
    inv.files.forEach(function (f) {
      var a = areaOf(f.file);
      areas[a] = areas[a] || { key: a, value: 0, files: [] };
      areas[a].value += f.specs.length;
      areas[a].files.push({ file: f.file, n: f.specs.length });
    });
    var list = Object.keys(areas).map(function (k) { return areas[k]; }).filter(function (a) { return a.value > 0; })
      .sort(function (a, b) { return b.value - a.value; });
    if (!list.length) { host.appendChild(el('div', 'empty', 'No tests found.')); return; }
    var sum = list.reduce(function (s, a) { return s + a.value; }, 0);
    list.forEach(function (a, i) {
      a.area = a.value / sum * W * H;
      a.color = i < AREA_COLORS.length ? AREA_COLORS[i] : AREA_OTHER;
      a.darkText = !!AREA_DARK_TEXT[i];
    });
    var legend = list.slice(0, AREA_COLORS.length).map(function (a) { return { label: a.key, color: a.color }; });
    if (list.length > AREA_COLORS.length) legend.push({ label: 'other areas', color: AREA_OTHER });
    legendInto($('ov-inv-legend'), legend);
    squarify(list, { x: 0, y: 0, w: W, h: H }).forEach(function (c) {
      var a = c.n;
      var cell = el('div', 'cell');
      cell.style.left = c.x + 'px'; cell.style.top = c.y + 'px';
      cell.style.width = c.w + 'px'; cell.style.height = c.h + 'px';
      cell.style.background = a.color;
      if (a.darkText) cell.style.color = '#0b0b0b';
      cell.setAttribute('aria-label', a.key + ': ' + a.value + ' tests');
      if (c.w > 64 && c.h > 34) {
        cell.appendChild(el('b', null, a.key));
        cell.appendChild(el('span', null, a.value + (a.value === 1 ? ' test' : ' tests')));
      } else if (c.w > 26 && c.h > 18) {
        cell.appendChild(el('span', null, String(a.value)));
      }
      attachTip(cell, function () { return 'tests/' + (a.key === '(root)' ? '' : a.key + '/') + ' · ' + a.value + ' tests'; }, function () {
        var rows = a.files.slice().sort(function (x, y) { return y.n - x.n; }).slice(0, 8)
          .map(function (f) { return { label: f.file.split('/').pop(), value: String(f.n), color: a.color }; });
        if (a.files.length > 8) rows.push({ label: '+' + (a.files.length - 8) + ' more files', value: '' });
        return rows;
      });
      host.appendChild(cell);
    });
  }

  // ---- redraw on show / resize / scheme change -----------------------------
  function redraw() {
    if ($('panel-overview').hidden) return;
    if (finished().length && st.selected) {
      trendChart();
      rateChart();
      durationChart();
      matrix();
    }
    treemap();
  }
  statusLegend($('ov-trend-legend'));
  statusLegend($('ov-files-legend'));
  statusLegend($('ov-matrix-legend'), true);
  $('ov-run').addEventListener('change', function () { select(this.value); });
  var pending = null;
  if (window.ResizeObserver) {
    var lastW = 0;
    new ResizeObserver(function (entries) {
      var w = entries[0].contentRect.width;
      if (Math.abs(w - lastW) < 4) return;
      lastW = w;
      clearTimeout(pending);
      pending = setTimeout(redraw, 80);
    }).observe($('panel-overview'));
  }

  api.setRuns = setRuns;
  api.select = select;
  api.setInventory = setInventory;
  api.redraw = redraw;
  return api;
})();
