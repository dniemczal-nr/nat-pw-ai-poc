#!/usr/bin/env node
/**
 * Builds UNIQA full-suite report (MD + HTML + summary JSON) from Playwright JSON
 * or list-reporter log. Includes charts + EIM Workflow Spec (UNIQA-6) coverage.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/test-reports');
const JSON_CANDIDATES = [
  path.join(OUT_DIR, 'uniqa-full-results.json'),
  path.join(ROOT, 'test-results', 'results.json'),
  path.join(ROOT, 'playwright-report', 'results.json'),
];
const LOG_FILE = path.join(OUT_DIR, 'uniqa-full-run.log');

const EIM_COVERAGE = [
  {
    area: 'Nawigacja / dostęp do worklist EIM',
    specRef: 'UNIQA-6 — worklists & analyst entry points',
    status: 'covered',
    evidence: 'Menu smoke Group Work + My Work; sibling chrome; My Work worklists',
  },
  {
    area: 'All Alerts — wyszukiwanie / filtry (core + supplementary)',
    specRef: 'UNIQA-6 — alert search criteria surface',
    status: 'covered',
    evidence: 'all-alerts-filters, all-alerts-core-fields, OU apply UX',
  },
  {
    area: 'Matching Alerts — model kolumn listy',
    specRef: 'UNIQA-6 — alert list / assignment visibility',
    status: 'covered',
    evidence: 'grid-headers, grid-columns (required + optional inventory)',
  },
  {
    area: 'Wymiar organizacyjny (OU) na listach i w Admin',
    specRef: 'UNIQA-6 / org traceability',
    status: 'covered',
    evidence: 'OU filter, Admin OU read-only, OU option consistency',
  },
  {
    area: 'Odporność Search (wynik pusty / nonsense)',
    specRef: 'UNIQA-6 — resilient search UX',
    status: 'covered',
    evidence: 'negative Alert ID / Customer / Case Identifier',
  },
  {
    area: 'My Work — kolejki analityka (Alerts/Cases/…)',
    specRef: 'UNIQA-6 — analyst personal worklists',
    status: 'partial',
    evidence: 'worklist chrome + empty-or-rows; bez Get Next / claim',
  },
  {
    area: 'Claim / Assign / Unassign alertu',
    specRef: 'UNIQA-6 — assignment transitions',
    status: 'gap',
    evidence: 'celowo out of scope (non-destructive PoC)',
  },
  {
    area: 'Alert detail — przejścia stanów workflow',
    specRef: 'UNIQA-6 — state machine / disposition',
    status: 'gap',
    evidence: 'celowo out of scope',
  },
  {
    area: 'Hibernate / Close / Create Case z alertu',
    specRef: 'UNIQA-6 — case linkage & lifecycle',
    status: 'gap',
    evidence: 'celowo out of scope',
  },
  {
    area: 'Get Next Alert (akcja biznesowa)',
    specRef: 'UNIQA-6 — work intake',
    status: 'gap',
    evidence: 'tylko open-only w menu smoke (jeśli obecne)',
  },
];

const SCENARIO_BLURBS = [
  {
    match: /authenticate as admin|auth\.setup/i,
    area: 'Auth',
    step: '0',
    blurb: 'Loguje admina i zapisuje storageState (.auth/user.json).',
  },
  {
    match: /seed — authenticated|shell header is visible for logged-in/i,
    area: 'Auth',
    step: '0',
    blurb: 'Weryfikuje, że storageState otwiera shell admina bez ponownego logowania.',
  },
  {
    match: /Admin UI login|admin can log in/i,
    area: 'Auth',
    step: '0',
    blurb: 'Scenariusz logowania UI (credentials) — smoke ścieżki login.',
  },
  {
    match: /Admin logout|log out successfully|logged-out user cannot/i,
    area: 'Auth',
    step: '0',
    blurb: 'Wylogowanie i brak chrome admina po logout.',
  },
  {
    match: /NetReveal login and logout|login and logout as admin/i,
    area: 'Auth',
    step: '0',
    blurb: 'Pełny cykl login→logout (legacy check-login).',
  },
  {
    match: /shell header and user menu|user menu opens/i,
    area: 'Shell',
    step: '0',
    blurb: 'Chrome nagłówka shella i menu użytkownika (logout widoczne).',
  },
  {
    match: /Menu smoke|opens \(/i,
    area: 'Menu',
    step: '1',
    blurb: 'Smoke: nawigacja menu → ekran otwiera się bez błędu (landmark / tytuł).',
  },
  {
    match: /1\.1 primary regions|primary regions are visible/i,
    area: 'Group Work',
    step: '2',
    blurb: 'All Alerts: widoczne główne regiony formularza wyszukiwania i wyników.',
  },
  {
    match: /2\.1 Organization Unit dropdown/i,
    area: 'Group Work',
    step: '2',
    blurb: 'All Alerts: dropdown Organization Unit dostępny pod Supplementary Attributes.',
  },
  {
    match: /2\.2 other filter dropdowns/i,
    area: 'Group Work',
    step: '2',
    blurb: 'All Alerts: pozostałe filtry select (Domain, Source, Active, Priority, Status).',
  },
  {
    match: /2\.3 Organization Unit participates/i,
    area: 'Group Work',
    step: '2',
    blurb: 'All Alerts: wybór OU uczestniczy w UX filtrów (apply bez destrukcji).',
  },
  {
    match: /3\.1 actions and grid chrome/i,
    area: 'Group Work',
    step: '2',
    blurb: 'All Alerts: chrome akcji i siatki Matching Alerts.',
  },
  {
    match: /A\.1 .*opens with search\/results|sibling screen chrome|A\.1 /i,
    area: 'Group Work',
    step: '3',
    blurb: 'Sibling Group Work: landmarki search/results (Hibernated, Subjects, Cases, …).',
  },
  {
    match: /A\.2 .*Organization Unit when present/i,
    area: 'Group Work',
    step: '3',
    blurb: 'Sibling: OU select gdy obecny na ekranie.',
  },
  {
    match: /B\.1 Core Attributes fields/i,
    area: 'Group Work',
    step: '3',
    blurb: 'All Alerts Core Attributes: pola search (Alert ID, Assigned, daty, customer…).',
  },
  {
    match: /B\.2 negative Alert ID search/i,
    area: 'Group Work',
    step: '3',
    blurb: 'Negatywne search po Alert ID — shell pozostaje używalny.',
  },
  {
    match: /B\.3 fill-and-clear/i,
    area: 'Group Work',
    step: '3',
    blurb: 'Wypełnij i wyczyść Main Customer Name — reset formularza.',
  },
  {
    match: /C\.1 required Matching Alerts column headers|A\.1 required Matching Alerts headers/i,
    area: 'Group Work',
    step: '3–4',
    blurb: 'Wymagane nagłówki Matching Alerts (Alert ID, Type, Priority, Status, OU, Assigned To).',
  },
  {
    match: /C\.2 grid column filter row|A\.4 filter-row/i,
    area: 'Group Work',
    step: '3–4',
    blurb: 'Chrome wiersza filtrów kolumn na siatce wyników.',
  },
  {
    match: /A\.2 optional Matching Alerts columns/i,
    area: 'Group Work',
    step: '4',
    blurb: 'Soft inventory opcjonalnych kolumn (Description, Age, Customer…).',
  },
  {
    match: /A\.3 required header relative order/i,
    area: 'Group Work',
    step: '4',
    blurb: 'Soft-check względnej kolejności wymaganych nagłówków.',
  },
  {
    match: /E\.1 negative Alert ID/i,
    area: 'Group Work',
    step: '4',
    blurb: 'Negatywne Alert ID (rozszerzony negative Search).',
  },
  {
    match: /E\.2 negative Main Customer/i,
    area: 'Group Work',
    step: '4',
    blurb: 'Negatywne Main Customer Name — pusty wynik, shell OK.',
  },
  {
    match: /E\.3 negative Case Identifier/i,
    area: 'Group Work',
    step: '4',
    blurb: 'Negatywne Case Identifier — pusty wynik, shell OK.',
  },
  {
    match: /B\.1 .*shows list\/grid chrome|My Work — analyst/i,
    area: 'My Work',
    step: '4',
    blurb: 'My Work worklist: tabela lub empty-state (bez Get Next / claim).',
  },
  {
    match: /B\.2 .*landmark chrome/i,
    area: 'My Work',
    step: '4',
    blurb: 'My Work ekran: landmarki chrome (np. Inbox / Tasks).',
  },
  {
    match: /C\.1 Organizational Units list opens/i,
    area: 'Administration',
    step: '4',
    blurb: 'Admin → Organizational Units: lista otwiera się (read-only).',
  },
  {
    match: /C\.2 list has identity columns/i,
    area: 'Administration',
    step: '4',
    blurb: 'Admin OU: kolumny Code/Name / chrome wierszy.',
  },
  {
    match: /D\.1–D\.2 Admin OU|OU option consistency/i,
    area: 'Cross-cutting',
    step: '4',
    blurb: 'Nakładanie kodów/nazw Admin OU vs select All Alerts OU.',
  },
  {
    match: /D\.3 sibling OU selects/i,
    area: 'Cross-cutting',
    step: '4',
    blurb: 'Sibling Group Work: OU selecty populowane gdy obecne.',
  },
];

function classify(title, file = '') {
  const hay = `${file} ${title}`;
  for (const s of SCENARIO_BLURBS) {
    if (s.match.test(hay)) return s;
  }
  if (/menu\//i.test(file)) {
    return {
      area: 'Menu',
      step: '1',
      blurb: 'Smoke otwarcia ekranu z menu głównego.',
    };
  }
  if (/group-work/i.test(file)) {
    return {
      area: 'Group Work',
      step: '2–4',
      blurb: 'Scenariusz Group Work / All Alerts (EIM worklist).',
    };
  }
  if (/my-work/i.test(file)) {
    return {
      area: 'My Work',
      step: '4',
      blurb: 'Scenariusz My Work (kolejka analityka).',
    };
  }
  if (/administration/i.test(file)) {
    return {
      area: 'Administration',
      step: '4',
      blurb: 'Scenariusz Administration (read-only).',
    };
  }
  if (/cross-cutting/i.test(file)) {
    return {
      area: 'Cross-cutting',
      step: '4',
      blurb: 'Scenariusz cross-cutting (spójność OU).',
    };
  }
  return { area: 'Other', step: '—', blurb: 'Scenariusz UI / infrastruktura.' };
}

function statusIcon(s) {
  if (s === 'passed' || s === 'expected') return '✅';
  if (s === 'skipped') return '⏭';
  if (s === 'failed' || s === 'unexpected') return '❌';
  if (s === 'flaky') return '⚠';
  if (s === 'timedOut') return '⏱';
  return '•';
}

function normalizeStatus(s) {
  if (s === 'expected') return 'passed';
  if (s === 'unexpected') return 'failed';
  return s;
}

function extractJsonFromLog(text) {
  const marker = text.lastIndexOf('{"config"');
  if (marker === -1) {
    const alt = text.lastIndexOf('\n{');
    if (alt === -1) return null;
    try {
      return JSON.parse(text.slice(alt + 1));
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(text.slice(marker));
  } catch {
    // truncated JSON — ignore
    return null;
  }
}

function parseListLog(text) {
  const results = [];
  const re =
    /^\s*([✓✘×xX◦⊘-]|ok|FAIL|PASS)?\s*(\d+)\s+\[([^\]]+)\]\s+›\s+(.+?)\s+\(([^)]+)\)\s*$/gm;
  // Playwright list: "  ✓   1 [chromium] › path:line › title (1.8s)"
  const lineRe =
    /^\s*(✓|✘|°|-|×)\s+(\d+)\s+\[([^\]]+)\]\s+›\s+(.+)\s+\(([^)]+)\)\s*$/;
  const skipRe =
    /^\s*-\s+(\d+)\s+\[([^\]]+)\]\s+›\s+(.+)\s*$/;
  for (const raw of text.split(/\r?\n/)) {
    let m = raw.match(lineRe);
    if (m) {
      const mark = m[1];
      let status = 'passed';
      if (mark === '✘' || mark === '×') status = 'failed';
      else if (mark === '-' || mark === '°') status = 'skipped';
      const rest = m[4];
      const parts = rest.split(' › ');
      const filePart = parts[0] || '';
      const title = parts.slice(1).join(' › ') || rest;
      results.push({
        project: m[3],
        file: filePart.replace(/:\d+:\d+$/, ''),
        title,
        status,
        durationMs: parseDuration(m[5]),
      });
      continue;
    }
    m = raw.match(skipRe);
    if (m) {
      const rest = m[3];
      const parts = rest.split(' › ');
      results.push({
        project: m[2],
        file: (parts[0] || '').replace(/:\d+:\d+$/, ''),
        title: parts.slice(1).join(' › ') || rest,
        status: 'skipped',
        durationMs: 0,
      });
    }
  }
  return results;
}

function parseDuration(s) {
  if (!s) return 0;
  const m = String(s).trim().match(/^([\d.]+)\s*(ms|s|m)?$/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const u = (m[2] || 'ms').toLowerCase();
  if (u === 's') return Math.round(n * 1000);
  if (u === 'm') return Math.round(n * 60_000);
  return Math.round(n);
}

function walkSuites(suite, acc, projectName = '') {
  const proj = suite.projectName || projectName;
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const result = (t.results || [])[t.results.length - 1] || {};
      const status = normalizeStatus(t.status || result.status || 'unknown');
      acc.push({
        project: proj || t.projectName || '',
        file: spec.file || suite.file || '',
        title: [...(spec.title ? [spec.title] : []), t.title].filter(Boolean).join(' › ') ||
          spec.title ||
          t.title,
        status,
        durationMs: result.duration || 0,
        error: result.error?.message || '',
      });
    }
  }
  for (const child of suite.suites || []) walkSuites(child, acc, proj);
}

function fromPlaywrightJson(doc) {
  const acc = [];
  for (const suite of doc.suites || []) walkSuites(suite, acc);
  // Also flatten stats
  return acc;
}

function loadResults() {
  for (const p of JSON_CANDIDATES) {
    if (fs.existsSync(p) && fs.statSync(p).size > 50) {
      try {
        const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (doc.suites || doc.stats) {
          console.error(`Using JSON: ${p}`);
          return { source: p, tests: fromPlaywrightJson(doc), raw: doc };
        }
      } catch (e) {
        console.error(`Failed parse ${p}:`, e.message);
      }
    }
  }
  if (fs.existsSync(LOG_FILE)) {
    const text = fs.readFileSync(LOG_FILE, 'utf8');
    const extracted = extractJsonFromLog(text);
    if (extracted?.suites) {
      console.error('Using JSON extracted from log');
      return { source: LOG_FILE + '#json', tests: fromPlaywrightJson(extracted), raw: extracted };
    }
    const list = parseListLog(text);
    if (list.length) {
      console.error(`Using list log parse (${list.length} tests)`);
      return { source: LOG_FILE, tests: list, raw: null };
    }
  }
  throw new Error('No Playwright results found (JSON or list log).');
}

function fmtDur(ms) {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function svgPie(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const colors = {
    passed: '#0a7a2f',
    skipped: '#c9a227',
    failed: '#b00020',
    flaky: '#d97706',
    other: '#6b7280',
  };
  let angle = -Math.PI / 2;
  const cx = 120;
  const cy = 120;
  const r = 90;
  const parts = [];
  for (const [k, v] of Object.entries(counts)) {
    if (!v) continue;
    const slice = (v / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += slice;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    const color = colors[k] || colors.other;
    parts.push(
      `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${color}"><title>${k}: ${v}</title></path>`,
    );
  }
  const legend = Object.entries(counts)
    .filter(([, v]) => v)
    .map(
      ([k, v], i) =>
        `<rect x="240" y="${40 + i * 28}" width="14" height="14" fill="${colors[k] || colors.other}"/><text x="262" y="${52 + i * 28}" font-size="13" fill="#222">${k}: ${v}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240" role="img" aria-label="Wyniki testów">${parts.join('')}${legend}</svg>`;
}

function svgBars(byArea) {
  const areas = Object.keys(byArea);
  const max = Math.max(
    1,
    ...areas.map((a) => byArea[a].passed + byArea[a].skipped + byArea[a].failed),
  );
  const barH = 28;
  const gap = 12;
  const left = 140;
  const width = 480;
  const height = 40 + areas.length * (barH + gap);
  const rows = areas
    .map((area, i) => {
      const row = byArea[area];
      const total = row.passed + row.skipped + row.failed || 1;
      const y = 20 + i * (barH + gap);
      const scale = width / max;
      let x = left;
      const segs = [
        ['passed', row.passed, '#0a7a2f'],
        ['skipped', row.skipped, '#c9a227'],
        ['failed', row.failed, '#b00020'],
      ];
      const rects = segs
        .filter(([, v]) => v)
        .map(([name, v, color]) => {
          const w = Math.max(2, v * scale);
          const el = `<rect x="${x}" y="${y}" width="${w}" height="${barH}" fill="${color}"><title>${area} ${name}: ${v}</title></rect>`;
          x += w;
          return el;
        })
        .join('');
      return `<text x="0" y="${y + 19}" font-size="13" fill="#222">${escapeXml(area)}</text>${rects}<text x="${left + total * scale + 8}" y="${y + 19}" font-size="12" fill="#444">${total}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="${height}" viewBox="0 0 700 ${height}" role="img" aria-label="Wyniki wg obszaru">${rows}</svg>`;
}

function svgCoverage(items) {
  const counts = { covered: 0, partial: 0, gap: 0 };
  for (const i of items) counts[i.status] = (counts[i.status] || 0) + 1;
  const colors = { covered: '#0a7a2f', partial: '#c9a227', gap: '#b00020' };
  const labels = { covered: 'Pokryte', partial: 'Częściowo', gap: 'Luka' };
  const total = items.length || 1;
  let x = 0;
  const w = 560;
  const segs = Object.entries(counts)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const sw = (v / total) * w;
      const el = `<rect x="${x}" y="20" width="${sw}" height="36" fill="${colors[k]}"/><text x="${x + sw / 2}" y="44" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">${labels[k]} ${v}</text>`;
      x += sw;
      return el;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="80" viewBox="0 0 600 80" role="img" aria-label="Pokrycie EIM">${segs}</svg>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMd(s) {
  return String(s).replace(/\|/g, '\\|');
}

function main() {
  const { source, tests, raw } = loadResults();
  const enriched = tests.map((t) => {
    const title = t.title || '';
    const file = t.file || '';
    const meta = classify(title, file);
    return { ...t, ...meta, status: normalizeStatus(t.status) };
  });

  const counts = { passed: 0, skipped: 0, failed: 0, flaky: 0, other: 0 };
  const byArea = {};
  for (const t of enriched) {
    const s = t.status;
    if (s === 'passed') counts.passed++;
    else if (s === 'skipped') counts.skipped++;
    else if (s === 'failed' || s === 'timedOut') counts.failed++;
    else if (s === 'flaky') counts.flaky++;
    else counts.other++;
    if (!byArea[t.area]) byArea[t.area] = { passed: 0, skipped: 0, failed: 0 };
    if (s === 'passed') byArea[t.area].passed++;
    else if (s === 'skipped') byArea[t.area].skipped++;
    else byArea[t.area].failed++;
  }

  const total = enriched.length;
  const durationMs =
    raw?.stats?.duration ||
    enriched.reduce((a, t) => a + (t.durationMs || 0), 0);
  const when = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const verdict = counts.failed === 0 ? 'PASS' : 'FAIL';

  const groups = {};
  for (const t of enriched) {
    const key = `${t.step}::${t.area}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  const md = [];
  md.push('# Raport pełnej paczki testów UNIQA (EIM / PoC)');
  md.push('');
  md.push(`**Data przebiegu:** ${when}`);
  md.push(`**Środowisko:** UNIQA QA (\`nr-qa-uniqa.symphonyai.dev\`)`);
  md.push(`**Branch:** \`project/uniqa\``);
  md.push(`**Runner:** Playwright · projekt \`chromium\` · \`workers=1\` · storageState`);
  md.push(`**Źródło wyników:** \`${path.relative(ROOT, source)}\``);
  md.push(`**Czas (suma / stats):** ${fmtDur(durationMs)}`);
  md.push(`**Wynik:** **${verdict}**`);
  md.push('');
  md.push('## Podsumowanie');
  md.push('');
  md.push('| Metryka | Wartość |');
  md.push('|---|---|');
  md.push(`| Łącznie | ${total} |`);
  md.push(`| ✅ Passed | ${counts.passed} |`);
  md.push(`| ⏭ Skipped | ${counts.skipped} |`);
  md.push(`| ❌ Failed | ${counts.failed} |`);
  if (counts.flaky) md.push(`| ⚠ Flaky | ${counts.flaky} |`);
  md.push(`| Werdykt | **${verdict}** |`);
  md.push('');
  md.push('### Według obszaru');
  md.push('');
  md.push('| Obszar | Passed | Skipped | Failed |');
  md.push('|---|---:|---:|---:|');
  for (const [area, row] of Object.entries(byArea)) {
    md.push(`| ${area} | ${row.passed} | ${row.skipped} | ${row.failed} |`);
  }
  md.push('');
  md.push('## Wykresy');
  md.push('');
  md.push('_Wersja HTML zawiera wykresy SVG (kołowy statusów, słupkowy obszarów, pasek pokrycia EIM)._');
  md.push('');
  md.push('## Pokrycie EIM Workflow Spec (UNIQA-6)');
  md.push('');
  md.push(
    'Kontekst: [UNIQA-6 EIM Workflow Functional Specification](https://netreveal.atlassian.net/browse/UNIQA-6). Paczka PoC jest **non-destructive** — celowo bez claim/assign/detail transitions.',
  );
  md.push('');
  md.push('| Obszar EIM | Ref | Status pokrycia | Evidencja w testach |');
  md.push('|---|---|---|---|');
  for (const row of EIM_COVERAGE) {
    const label =
      row.status === 'covered' ? '✅ covered' : row.status === 'partial' ? '🟡 partial' : '⬜ gap';
    md.push(
      `| ${escapeMd(row.area)} | ${escapeMd(row.specRef)} | ${label} | ${escapeMd(row.evidence)} |`,
    );
  }
  md.push('');
  md.push('## Scenariusze — opis, status, czas');
  md.push('');

  const orderedKeys = Object.keys(groups).sort();
  for (const key of orderedKeys) {
    const [step, area] = key.split('::');
    md.push(`### Krok ${step} — ${area}`);
    md.push('');
    md.push('| Status | Scenariusz | Co robi | Czas |');
    md.push('|---|---|---|---|');
    for (const t of groups[key]) {
      md.push(
        `| ${statusIcon(t.status)} ${t.status} | ${escapeMd(t.title)} | ${escapeMd(t.blurb)} | ${fmtDur(t.durationMs)} |`,
      );
    }
    md.push('');
  }

  if (counts.failed) {
    md.push('## Failures');
    md.push('');
    for (const t of enriched.filter((x) => x.status === 'failed' || x.status === 'timedOut')) {
      md.push(`### ❌ ${t.title}`);
      md.push('');
      md.push(`- Plik: \`${t.file}\``);
      if (t.error) md.push(`- Błąd: ${t.error.split('\n')[0]}`);
      md.push('');
    }
  }

  md.push('## Plany / artefakty');
  md.push('');
  md.push('- `specs/uniqa-admin-menu-screens.md` — krok 1 menu smoke');
  md.push('- `specs/uniqa-group-work-all-alerts.md` — krok 2 filtry All Alerts');
  md.push('- `specs/uniqa-group-work-siblings-and-all-alerts-core.md` — krok 3 siblings/core/headers');
  md.push('- `specs/uniqa-matching-columns-my-work-ou-negative.md` — krok 4 columns/My Work/OU/negative');
  md.push('');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mdPath = path.join(OUT_DIR, 'uniqa-full-report.md');
  const htmlPath = path.join(OUT_DIR, 'uniqa-full-report.html');
  const sumPath = path.join(OUT_DIR, 'uniqa-full-summary.json');

  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');

  const htmlRows = orderedKeys
    .map((key) => {
      const [step, area] = key.split('::');
      const body = groups[key]
        .map(
          (t) =>
            `<tr><td class="${t.status}">${statusIcon(t.status)} ${escapeXml(t.status)}</td><td>${escapeXml(t.title)}</td><td>${escapeXml(t.blurb)}</td><td>${escapeXml(fmtDur(t.durationMs))}</td></tr>`,
        )
        .join('');
      return `<h3>Krok ${escapeXml(step)} — ${escapeXml(area)}</h3><table><thead><tr><th>Status</th><th>Scenariusz</th><th>Co robi</th><th>Czas</th></tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('\n');

  const eimRows = EIM_COVERAGE.map((row) => {
    const cls = row.status;
    const label =
      row.status === 'covered' ? '✅ covered' : row.status === 'partial' ? '🟡 partial' : '⬜ gap';
    return `<tr><td>${escapeXml(row.area)}</td><td>${escapeXml(row.specRef)}</td><td class="${cls}">${label}</td><td>${escapeXml(row.evidence)}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Raport pełnej paczki UNIQA — EIM Workflow</title>
<style>
body{font-family:system-ui,Segoe UI,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;line-height:1.45;color:#1a1a1a;background:linear-gradient(180deg,#f7fafc 0%,#fff 120px)}
h1,h2,h3{margin-top:1.5rem}
table{border-collapse:collapse;width:100%;margin:0.8rem 0}
th,td{border:1px solid #ddd;padding:0.45rem 0.6rem;text-align:left;font-size:0.9rem;vertical-align:top}
th{background:#f0f4f8}
.passed{color:#0a7a2f}.skipped{color:#8a6d00}.failed{color:#b00020}.covered{color:#0a7a2f}.partial{color:#8a6d00}.gap{color:#6b7280}
.badge{display:inline-block;padding:0.25rem 0.7rem;border-radius:6px;font-weight:700;background:${verdict === 'PASS' ? '#e8f5e9' : '#fdecea'};color:${verdict === 'PASS' ? '#0a7a2f' : '#b00020'}}
.charts{display:grid;grid-template-columns:1fr;gap:1.2rem;margin:1rem 0}
@media(min-width:900px){.charts{grid-template-columns:1fr 1fr}}
.chart-card{background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:8px}
code{background:#f0f0f0;padding:0.1rem 0.3rem;border-radius:3px}
</style>
</head>
<body>
<h1>Raport pełnej paczki testów UNIQA</h1>
<p><strong>Data:</strong> ${escapeXml(when)}<br>
<strong>Środowisko:</strong> UNIQA QA (<code>nr-qa-uniqa.symphonyai.dev</code>)<br>
<strong>Branch:</strong> <code>project/uniqa</code><br>
<strong>Runner:</strong> Playwright · <code>chromium</code> · <code>workers=1</code> · storageState<br>
<strong>Źródło:</strong> <code>${escapeXml(path.relative(ROOT, source))}</code><br>
<strong>Czas:</strong> ${escapeXml(fmtDur(durationMs))}<br>
<strong>Wynik:</strong> <span class="badge">${verdict}</span></p>

<h2>Podsumowanie</h2>
<table><thead><tr><th>Metryka</th><th>Wartość</th></tr></thead><tbody>
<tr><td>Łącznie</td><td>${total}</td></tr>
<tr><td>✅ Passed</td><td>${counts.passed}</td></tr>
<tr><td>⏭ Skipped</td><td>${counts.skipped}</td></tr>
<tr><td>❌ Failed</td><td>${counts.failed}</td></tr>
</tbody></table>

<div class="charts">
  <div class="chart-card"><h3>Statusy</h3>${svgPie(counts)}</div>
  <div class="chart-card"><h3>Według obszaru</h3>${svgBars(byArea)}</div>
</div>
<div class="chart-card"><h3>Pokrycie EIM Workflow Spec (UNIQA-6)</h3>${svgCoverage(EIM_COVERAGE)}
<table><thead><tr><th>Obszar EIM</th><th>Ref</th><th>Status</th><th>Ewidencja</th></tr></thead><tbody>${eimRows}</tbody></table>
<p style="font-size:0.9rem;color:#555">Kontekst: <a href="https://netreveal.atlassian.net/browse/UNIQA-6">UNIQA-6 EIM Workflow Functional Specification</a>. PoC non-destructive — bez claim/assign/detail transitions.</p>
</div>

<h2>Scenariusze — opis i status</h2>
${htmlRows}

<p style="margin-top:2rem;color:#666;font-size:0.85rem">Wygenerowano przez <code>scripts/generate-uniqa-full-report.mjs</code></p>
</body></html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(
    sumPath,
    JSON.stringify(
      {
        when,
        verdict,
        source: path.relative(ROOT, source),
        durationMs,
        counts,
        byArea,
        eimCoverage: EIM_COVERAGE,
        tests: enriched,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${htmlPath}`);
  console.log(`Wrote ${sumPath}`);
  console.log(`Verdict: ${verdict} (${counts.passed} pass / ${counts.skipped} skip / ${counts.failed} fail)`);
}

main();
