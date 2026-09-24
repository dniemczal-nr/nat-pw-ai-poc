/**
 * NAT — local dashboard for selecting and running Playwright tests.
 * Start with `npm run nat`; binds to 127.0.0.1 only. No external dependencies.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { listTests, type TestInventory } from './lib/testList';
import { RunManager } from './lib/runner';
import type { RunSelection } from './lib/report';

const ROOT = path.resolve(__dirname, '..');
const RUNS_DIR = path.join(ROOT, '.nat', 'runs');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.NAT_PORT) || 4747;
const RUN_ID = /^\d{8}-\d{6}(-\d+)?$/;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const runs = new RunManager(ROOT, RUNS_DIR);
let inventory: Promise<TestInventory> | null = null;

function getInventory(refresh = false): Promise<TestInventory> {
  if (!inventory || refresh) {
    inventory = listTests(ROOT).catch((err) => {
      inventory = null;
      throw err;
    });
  }
  return inventory;
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err: Error) => {
    if (!res.headersSent) sendJson(res, 500, { error: err.message });
    else res.end();
  });
});

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const { pathname } = url;
  const method = req.method ?? 'GET';

  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
  }

  if (method === 'GET' && pathname === '/api/inventory') {
    return sendJson(res, 200, await getInventory(url.searchParams.has('refresh')));
  }

  if (method === 'GET' && pathname === '/api/runs') {
    return sendJson(res, 200, { active: runs.activeId, runs: runs.listRuns() });
  }

  if (method === 'POST' && pathname === '/api/run') {
    const body = await readBody(req);
    const selection = await validateSelection(body);
    if ('error' in selection) return sendJson(res, 400, selection);
    if (runs.activeId) return sendJson(res, 409, { error: `Run ${runs.activeId} is still in progress` });
    return sendJson(res, 202, runs.start(selection));
  }

  const runMatch = pathname.match(/^\/api\/runs\/([^/]+)(?:\/(events|stop))?$/);
  if (runMatch) {
    const [, id, action] = runMatch;
    if (!RUN_ID.test(id)) return sendJson(res, 400, { error: 'Invalid run id' });
    if (method === 'GET' && !action) {
      const summary = runs.readSummary(id);
      return summary ? sendJson(res, 200, summary) : sendJson(res, 404, { error: 'No summary for this run yet' });
    }
    if (method === 'POST' && action === 'stop') {
      return runs.activeId === id
        ? sendJson(res, 200, { stopped: runs.stop() })
        : sendJson(res, 409, { error: 'That run is not active' });
    }
    if (method === 'GET' && action === 'events') return streamEvents(res, id);
  }

  const fileMatch = pathname.match(/^\/runs\/([^/]+)\/(report|log|html(?:\/.*)?)$/);
  if (method === 'GET' && fileMatch) {
    const [, id, rest] = fileMatch;
    if (!RUN_ID.test(id)) return sendJson(res, 400, { error: 'Invalid run id' });
    const dir = runs.runDir(id);
    if (rest === 'report') return sendFile(res, path.join(dir, 'report.html'));
    if (rest === 'log') return sendFile(res, path.join(dir, 'stdout.log'));
    const relative = rest === 'html' ? 'html/index.html' : decodeURIComponent(rest);
    const target = path.resolve(dir, relative);
    if (!target.startsWith(path.join(dir, 'html') + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });
    return sendFile(res, target);
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function validateSelection(body: unknown): Promise<RunSelection | { error: string }> {
  if (!body || typeof body !== 'object') return { error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;
  const inv = await getInventory();
  const knownFiles = new Set(inv.files.map((f) => f.file));
  const knownProjects = new Set(inv.projects);

  const files = asStringArray(b.files);
  const locations = asStringArray(b.locations);
  const projects = asStringArray(b.projects);
  if (!files || !locations || !projects) return { error: 'files, locations and projects must be string arrays' };

  for (const f of files) if (!knownFiles.has(f)) return { error: `Unknown test file: ${f}` };
  for (const loc of locations) {
    const m = loc.match(/^(.+):(\d+)$/);
    if (!m || !knownFiles.has(m[1])) return { error: `Unknown test location: ${loc}` };
  }
  for (const p of projects) if (!knownProjects.has(p)) return { error: `Unknown project: ${p}` };

  let workers: number | null = null;
  if (b.workers !== null && b.workers !== undefined && b.workers !== '') {
    workers = Number(b.workers);
    if (!Number.isInteger(workers) || workers < 1 || workers > 64) return { error: 'workers must be an integer from 1 to 64' };
  }

  let grep: string | null = null;
  if (typeof b.grep === 'string' && b.grep.trim()) {
    grep = b.grep.trim();
    if (grep.length > 500) return { error: 'grep is too long' };
    try {
      new RegExp(grep);
    } catch {
      return { error: 'grep is not a valid regular expression' };
    }
  }

  return { files, locations, projects, workers, grep };
}

function asStringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) return null;
  return [...new Set(value as string[])];
}

function streamEvents(res: http.ServerResponse, id: string): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const unsubscribe = runs.subscribe(id, (event) => {
    if (event.type === 'line') send('line', event.text);
    else {
      send('done', { exitCode: event.exitCode, totals: event.summary?.totals ?? null });
      res.end();
    }
  });
  if (!unsubscribe) {
    const summary = runs.readSummary(id);
    send('done', { exitCode: summary?.meta.exitCode ?? null, totals: summary?.totals ?? null, replay: true });
    res.end();
    return;
  }
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);
  res.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Body is not valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendFile(res: http.ServerResponse, file: string): void {
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return sendJson(res, 404, { error: 'Not found' });
    const type = CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size });
    fs.createReadStream(file).pipe(res);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`NAT dashboard: http://127.0.0.1:${PORT}`);
  console.log(`Repo: ${ROOT}`);
  console.log(`Runs: ${path.relative(ROOT, RUNS_DIR)}/`);
  void getInventory().then(
    (inv) => console.log(`Inventory: ${inv.total} tests in ${inv.files.length} files · projects: ${inv.projects.join(', ')}`),
    (err: Error) => console.error(`Inventory failed: ${err.message}`),
  );
});
