(function () {
  var $ = function (id) { return document.getElementById(id); };
  var state = { inventory: null, selected: new Set(), search: '', runId: null, es: null };
  var LABEL = { passed: 'Passed', failed: 'Failed', flaky: 'Flaky', skipped: 'Skipped' };
  var ICON = { passed: '✓', failed: '✕', flaky: '↻', skipped: '–' };
  var COLOR = { passed: 'var(--good)', failed: 'var(--critical)', flaky: 'var(--warning)', skipped: 'var(--neutral)' };
  var Overview = window.NATOverview;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function specKey(file, spec) { return file + ':' + spec.line + ':' + spec.title; }
  function fmtMs(ms) {
    if (ms === null || ms === undefined) return '';
    if (ms < 1000) return Math.round(ms) + ' ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
    var m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }
  function fmtDate(iso) { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  function matches(file, spec) {
    var q = state.search.trim().toLowerCase();
    if (!q) return true;
    var hay = (file + ' ' + spec.titlePath.join(' ') + ' ' + spec.title + ' ' + spec.tags.join(' ')).toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  // ---- Tabs -------------------------------------------------------------
  var TABS = ['overview', 'runner', 'history'];
  function showTab(name, focus) {
    if (TABS.indexOf(name) === -1) name = 'overview';
    TABS.forEach(function (t) {
      var on = t === name;
      $('tab-' + t).setAttribute('aria-selected', on ? 'true' : 'false');
      $('tab-' + t).tabIndex = on ? 0 : -1;
      $('panel-' + t).hidden = !on;
    });
    if (focus) $('tab-' + name).focus();
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    if (name === 'overview') Overview.redraw();
  }
  document.querySelectorAll('.tabs [role=tab]').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
    b.addEventListener('keydown', function (e) {
      var i = TABS.indexOf(b.dataset.tab);
      if (e.key === 'ArrowRight') { e.preventDefault(); showTab(TABS[(i + 1) % TABS.length], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showTab(TABS[(i + TABS.length - 1) % TABS.length], true); }
    });
  });
  window.addEventListener('hashchange', function () { showTab(location.hash.slice(1)); });
  Overview.onOpenRun = function () { showTab('overview'); };

  // ---- Inventory & tree -------------------------------------------------
  function loadInventory(refresh) {
    $('tree').textContent = '';
    $('tree').appendChild(el('div', 'empty', refresh ? 'Refreshing inventory (playwright --list)…' : 'Loading inventory…'));
    return fetch('/api/inventory' + (refresh ? '?refresh=1' : '')).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || r.statusText); });
      return r.json();
    }).then(function (inv) {
      state.inventory = inv;
      var valid = new Set();
      inv.files.forEach(function (f) { f.specs.forEach(function (s) { valid.add(specKey(f.file, s)); }); });
      state.selected.forEach(function (k) { if (!valid.has(k)) state.selected.delete(k); });
      $('inv-hint').textContent = inv.total + ' tests · ' + inv.files.length + ' files';
      $('tab-runner-badge').textContent = inv.total;
      renderProjects(inv.projects.filter(function (p) { return inv.implicitProjects.indexOf(p) === -1; }));
      renderTree();
      Overview.setInventory(inv);
    }).catch(function (err) {
      $('tree').textContent = '';
      $('tree').appendChild(el('div', 'error', 'Could not load the test inventory: ' + err.message));
    });
  }

  function renderProjects(projects) {
    var saved = safeGet('nat.projects');
    var wrap = $('projects');
    wrap.textContent = '';
    projects.forEach(function (p) {
      var lab = el('label');
      var cb = el('input'); cb.type = 'checkbox'; cb.value = p;
      cb.checked = saved ? saved.indexOf(p) !== -1 : p === 'chromium';
      cb.addEventListener('change', persistSettings);
      lab.appendChild(cb);
      lab.appendChild(el('span', null, p));
      wrap.appendChild(lab);
    });
  }

  function renderTree() {
    var tree = $('tree');
    var open = {};
    tree.querySelectorAll('details').forEach(function (d) { open[d.dataset.file] = d.open; });
    tree.textContent = '';
    var inv = state.inventory;
    if (!inv) return;
    var shown = 0;
    inv.files.forEach(function (f) {
      var specs = f.specs.filter(function (s) { return matches(f.file, s); });
      if (!specs.length) return;
      shown += specs.length;
      var d = el('details');
      d.dataset.file = f.file;
      d.open = f.file in open ? open[f.file] : !!state.search;
      var sum = el('summary');
      var cb = el('input'); cb.type = 'checkbox'; cb.setAttribute('aria-label', 'Select all tests in ' + f.file);
      var sel = specs.filter(function (s) { return state.selected.has(specKey(f.file, s)); }).length;
      cb.checked = sel === specs.length; cb.indeterminate = sel > 0 && sel < specs.length;
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        specs.forEach(function (s) { var k = specKey(f.file, s); if (cb.checked) state.selected.add(k); else state.selected.delete(k); });
        renderTree();
      });
      sum.appendChild(el('span', 'chev', '›'));
      sum.appendChild(cb);
      var name = el('span', 'file', f.file); name.title = f.file;
      sum.appendChild(name);
      sum.appendChild(el('span', 'count', sel + '/' + specs.length));
      d.appendChild(sum);
      specs.forEach(function (s) {
        var k = specKey(f.file, s);
        var lab = el('label', 'spec');
        var c = el('input'); c.type = 'checkbox'; c.checked = state.selected.has(k);
        c.addEventListener('change', function () { if (c.checked) state.selected.add(k); else state.selected.delete(k); renderTree(); });
        lab.appendChild(c);
        var t = el('span', 't');
        if (s.titlePath.length) t.appendChild(el('span', 'path', s.titlePath.join(' › ') + ' › '));
        t.appendChild(el('span', null, s.title));
        s.tags.forEach(function (tag) { t.appendChild(el('span', 'tag', tag)); });
        lab.appendChild(t);
        lab.appendChild(el('span', 'line', ':' + s.line));
        d.appendChild(lab);
      });
      tree.appendChild(d);
    });
    if (!shown) tree.appendChild(el('div', 'empty', state.search ? 'No tests match the filter.' : 'No tests found.'));
    $('sel-count').textContent = state.selected.size ? '· ' + state.selected.size + ' selected' : '· none selected (runs everything)';
  }

  $('search').addEventListener('input', function () { state.search = this.value; renderTree(); });
  $('btn-all').addEventListener('click', function () {
    state.inventory.files.forEach(function (f) { f.specs.forEach(function (s) { if (matches(f.file, s)) state.selected.add(specKey(f.file, s)); }); });
    renderTree();
  });
  $('btn-none').addEventListener('click', function () { state.selected.clear(); renderTree(); });
  $('btn-refresh').addEventListener('click', function () { loadInventory(true); });
  $('btn-expand').addEventListener('click', function () { $('tree').querySelectorAll('details').forEach(function (d) { d.open = true; }); });
  $('btn-collapse').addEventListener('click', function () { $('tree').querySelectorAll('details').forEach(function (d) { d.open = false; }); });

  // ---- Settings persistence ---------------------------------------------
  function safeGet(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function safeSet(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function selectedProjects() {
    return Array.prototype.map.call($('projects').querySelectorAll('input:checked'), function (c) { return c.value; });
  }
  function persistSettings() {
    safeSet('nat.projects', selectedProjects());
    safeSet('nat.workers', $('workers').value);
  }
  $('workers').addEventListener('change', persistSettings);
  (function restore() { var w = safeGet('nat.workers'); if (w) $('workers').value = w; })();

  // ---- Environments -----------------------------------------------------
  var envState = { items: [] };
  function loadEnvs(selectId) {
    return fetch('/api/envs').then(function (r) { return r.json(); }).then(function (data) {
      envState.items = data.envs;
      $('env-dir').textContent = data.importDir + '/';
      var sel = $('env');
      var wanted = selectId !== undefined ? selectId : (sel.value || safeGet('nat.env') || '');
      sel.textContent = '';
      var def = el('option', null, 'Server default (inherited from npm run nat)'); def.value = '';
      sel.appendChild(def);
      ['root', 'imported'].forEach(function (source) {
        var items = data.envs.filter(function (e) { return e.source === source; });
        if (!items.length) return;
        var group = el('optgroup'); group.label = source === 'root' ? 'Repo root' : 'Imported (' + data.importDir + ')';
        items.forEach(function (e) {
          var o = el('option', null, e.name + ' — ' + e.keys.length + ' keys'); o.value = e.id; o.title = e.file;
          group.appendChild(o);
        });
        sel.appendChild(group);
      });
      sel.value = data.envs.some(function (e) { return e.id === wanted; }) ? wanted : '';
      onEnvChange();
    });
  }
  function currentEnv() { return envState.items.find(function (e) { return e.id === $('env').value; }) || null; }
  var previewSeq = 0;
  function onEnvChange() {
    var item = currentEnv();
    safeSet('nat.env', $('env').value);
    $('btn-env-delete').hidden = !(item && item.source === 'imported');
    var pv = $('env-preview');
    pv.className = 'hint'; pv.textContent = 'Resolving…';
    var seq = ++previewSeq;
    var url = item ? '/api/envs/' + item.id + '/resolve' : '/api/envs/resolve';
    fetch(url).then(function (r) { return r.json(); }).then(function (p) {
      if (seq !== previewSeq) return;
      pv.textContent = '';
      if (!p.ok) { pv.className = 'hint bad'; pv.textContent = 'Config error: ' + p.error; return; }
      pv.className = 'hint ok';
      var v = p.values;
      var parts = [];
      parts.push('ui.baseUrl: ' + (v['ui.baseUrl'] || '—'));
      if (v['application.environment']) parts.push('application.environment: ' + v['application.environment']);
      if (v['ProjectName']) parts.push('project: ' + v['ProjectName']);
      if (v['ssh.host']) parts.push('ssh: ' + (v['ssh.user'] ? v['ssh.user'] + '@' : '') + v['ssh.host']);
      parts.push('env file: ' + (p.envFile ? p.envFile.replace(/^.*\/(\.nat\/|)/, '$1') : 'none'));
      pv.textContent = parts.join(' · ');
      if (/\$\{/.test(v['ui.baseUrl'] || '') || !v['ui.baseUrl']) { pv.className = 'hint bad'; pv.textContent += ' — ui.baseUrl is unresolved; UI tests will not log in.'; }
    }).catch(function (err) { if (seq === previewSeq) { pv.className = 'hint bad'; pv.textContent = 'Could not resolve config: ' + err.message; } });
  }
  $('env').addEventListener('change', onEnvChange);
  $('btn-env-import').addEventListener('click', function () {
    var panel = $('env-import');
    panel.hidden = !panel.hidden;
    this.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) $('env-name').focus();
  });
  $('env-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (!$('env-name').value) $('env-name').value = f.name.replace(/\.env$/, '').replace(/^\.env$/, 'default').replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 41);
    var reader = new FileReader();
    reader.onload = function () { $('env-content').value = String(reader.result || ''); };
    reader.readAsText(f);
  });
  $('btn-env-save').addEventListener('click', function () {
    $('env-error').textContent = '';
    var body = { name: $('env-name').value.trim(), content: $('env-content').value, overwrite: $('env-overwrite').checked };
    fetch('/api/envs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || r.statusText); return b; }); })
      .then(function (item) {
        $('env-content').value = ''; $('env-file').value = ''; $('env-name').value = ''; $('env-overwrite').checked = false;
        $('env-import').hidden = true; $('btn-env-import').setAttribute('aria-expanded', 'false');
        return loadEnvs(item.id);
      })
      .catch(function (err) { $('env-error').textContent = err.message; });
  });
  $('btn-env-delete').addEventListener('click', function () {
    var item = currentEnv();
    if (!item || !confirm('Remove imported environment "' + item.name + '" (' + item.file + ')?')) return;
    fetch('/api/envs/' + item.id, { method: 'DELETE' })
      .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || r.statusText); }); })
      .then(function () { return loadEnvs(''); })
      .catch(function (err) { $('run-error').textContent = err.message; });
  });

  // ---- Running ----------------------------------------------------------
  function buildSelection() {
    var files = [], locations = [];
    state.inventory.files.forEach(function (f) {
      var picked = f.specs.filter(function (s) { return state.selected.has(specKey(f.file, s)); });
      if (!picked.length) return;
      if (picked.length === f.specs.length) { files.push(f.file); return; }
      picked.forEach(function (s) { locations.push([f.file].concat(s.titlePath, [s.title]).join(' › ')); });
    });
    return {
      files: files,
      locations: locations,
      projects: selectedProjects(),
      workers: $('workers').value ? Number($('workers').value) : null,
      grep: $('grep').value || null,
      env: $('env').value || null
    };
  }

  function setRunning(running, id) {
    $('btn-run').disabled = running;
    $('btn-stop').disabled = !running;
    var g = $('global-status');
    g.textContent = '';
    g.appendChild(el('span', 'dot' + (running ? ' running' : '')));
    g.appendChild(document.createTextNode(running ? 'Running ' + id : 'Idle'));
  }

  function appendLog(text) {
    var log = $('log');
    var line = el('div', /✓|passed/.test(text) && !/failed/.test(text) ? 'ok' : (/✘|✖|✗|\bfailed\b|Error:/.test(text) ? 'bad' : null), text);
    log.appendChild(line);
    if ($('autoscroll').checked) log.scrollTop = log.scrollHeight;
  }

  function attachEvents(id) {
    if (state.es) state.es.close();
    var es = new EventSource('/api/runs/' + id + '/events');
    state.es = es;
    es.addEventListener('line', function (e) { appendLog(JSON.parse(e.data)); });
    es.addEventListener('done', function (e) {
      var d = JSON.parse(e.data);
      es.close(); state.es = null;
      setRunning(false);
      var st = $('run-status'); st.textContent = '';
      st.appendChild(el('span', null, 'Finished · exit ' + (d.exitCode === null ? '—' : d.exitCode) + ' · '));
      var a = el('a', null, 'Open report'); a.href = '/runs/' + id + '/report'; a.target = '_blank';
      st.appendChild(a);
      st.appendChild(document.createTextNode(' · '));
      var ov = el('button', 'link', 'Show in overview'); ov.type = 'button';
      ov.addEventListener('click', function () { Overview.select(id); showTab('overview'); });
      st.appendChild(ov);
      if (d.totals) { st.appendChild(document.createTextNode(' ')); st.appendChild(chips(d.totals)); }
      loadHistory(id);
    });
    es.onerror = function () { /* the server closes the stream when the run ends */ };
  }

  $('btn-run').addEventListener('click', function () {
    $('run-error').textContent = '';
    if (!state.inventory) return;
    var sel = buildSelection();
    if (!sel.projects.length) { $('run-error').textContent = 'Pick at least one browser / project.'; return; }
    persistSettings();
    $('log').textContent = '';
    $('run-status').textContent = '';
    fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sel) })
      .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || r.statusText); return b; }); })
      .then(function (meta) {
        state.runId = meta.id;
        setRunning(true, meta.id);
        $('run-status').textContent = 'Started ' + meta.id;
        attachEvents(meta.id);
        loadHistory();
      })
      .catch(function (err) { $('run-error').textContent = err.message; });
  });

  $('btn-stop').addEventListener('click', function () {
    if (!state.runId) return;
    fetch('/api/runs/' + state.runId + '/stop', { method: 'POST' });
  });

  // ---- History ----------------------------------------------------------
  function chips(t) {
    var wrap = el('span', 'chips');
    ['passed', 'failed', 'flaky', 'skipped'].forEach(function (k) {
      if (!t[k] && k !== 'passed') return;
      var c = el('span', 'chip ' + k);
      c.appendChild(el('i'));
      c.appendChild(el('span', null, ICON[k] + ' ' + t[k]));
      c.title = LABEL[k];
      wrap.appendChild(c);
    });
    return wrap;
  }
  function mini(t) {
    var bar = el('span', 'mini');
    bar.setAttribute('aria-hidden', 'true');
    var total = t.passed + t.failed + t.flaky + t.skipped;
    ['passed', 'failed', 'flaky', 'skipped'].forEach(function (k) {
      if (!t[k]) return;
      var i = el('i'); i.style.width = (t[k] / total * 100) + '%'; i.style.background = COLOR[k];
      bar.appendChild(i);
    });
    return bar;
  }

  function loadHistory(selectId) {
    return fetch('/api/runs').then(function (r) { return r.json(); }).then(function (data) {
      var table = $('history');
      table.textContent = '';
      $('hist-hint').textContent = data.runs.length ? data.runs.length + (data.runs.length === 1 ? ' run' : ' runs') + ' · .nat/runs/' : '';
      $('tab-history-badge').textContent = data.runs.length || '';
      Overview.setRuns(data.runs, selectId);
      if (!data.runs.length) { table.appendChild(el('caption', 'empty', 'No runs yet. Select tests and press “Run selected”.')); return; }
      var thead = el('thead'); var tr = el('tr');
      ['Run', 'Started', 'Environment', 'Projects', 'Workers', 'Targets', 'Outcome', 'Pass rate', 'Duration', 'Links'].forEach(function (h) {
        tr.appendChild(el('th', h === 'Pass rate' || h === 'Duration' ? 'num' : null, h));
      });
      thead.appendChild(tr); table.appendChild(thead);
      var tbody = el('tbody');
      data.runs.forEach(function (r) {
        var row = el('tr');
        var idc = el('td', 'mono', r.meta.id);
        if (r.meta.importedFrom) { var tg = el('span', 'tag imported', 'imported'); tg.title = r.meta.importedFrom; idc.appendChild(tg); }
        row.appendChild(idc);
        row.appendChild(el('td', null, fmtDate(r.meta.startedAt)));
        row.appendChild(el('td', 'mono', r.meta.selection.env ? r.meta.selection.env.name : 'default'));
        row.appendChild(el('td', 'mono', r.meta.selection.projects.join(', ') || 'default'));
        row.appendChild(el('td', 'mono', r.meta.selection.workers === null ? 'auto' : String(r.meta.selection.workers)));
        var targets = r.meta.selection.files.length + r.meta.selection.locations.length;
        var tcell = el('td', null, r.meta.importedFrom ? 'imported report' : (targets ? targets + ' target' + (targets === 1 ? '' : 's') : 'all tests'));
        if (r.meta.selection.grep) tcell.appendChild(el('div', 'hint', 'grep: ' + r.meta.selection.grep));
        row.appendChild(tcell);
        var oc = el('td');
        if (r.running) { oc.appendChild(el('span', 'status', 'running…')); }
        else if (r.totals) { oc.appendChild(mini(r.totals)); oc.appendChild(chips(r.totals)); }
        else oc.appendChild(el('span', 'hint', r.meta.stopped ? 'stopped' : 'no results'));
        row.appendChild(oc);
        row.appendChild(el('td', 'num', r.totals && r.totals.passRate !== null ? r.totals.passRate + '%' : '—'));
        row.appendChild(el('td', 'num', fmtMs(r.durationMs)));
        var links = el('td');
        if (!r.running) {
          if (r.totals) {
            var ob = el('button', 'link', 'Overview'); ob.type = 'button';
            ob.addEventListener('click', function () { Overview.select(r.meta.id); showTab('overview'); });
            links.appendChild(ob);
          }
          var a1 = el('a', null, 'Report'); a1.href = '/runs/' + r.meta.id + '/report'; a1.target = '_blank'; links.appendChild(a1);
          if (r.hasNativeReport) {
            var a2 = el('a', null, 'Playwright report'); a2.href = '/runs/' + r.meta.id + '/html/index.html'; a2.target = '_blank'; links.appendChild(a2);
          }
        } else {
          var b = el('button', 'link', 'Follow'); b.type = 'button';
          b.addEventListener('click', function () { state.runId = r.meta.id; setRunning(true, r.meta.id); $('log').textContent = ''; attachEvents(r.meta.id); showTab('runner'); });
          links.appendChild(b);
        }
        var a3 = el('a', null, 'Log'); a3.href = '/runs/' + r.meta.id + '/log'; a3.target = '_blank'; links.appendChild(a3);
        row.appendChild(links);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      if (data.active && data.active !== state.runId) {
        state.runId = data.active;
        setRunning(true, data.active);
        $('log').textContent = '';
        attachEvents(data.active);
      }
    });
  }

  showTab(location.hash.slice(1) || 'overview');
  loadEnvs();
  loadInventory(false).then(function () { return loadHistory(); });
})();
