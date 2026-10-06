/**
 * On-demand start for multi-machine perf runs: every shard (PERF_SHARD=i/n, PERF_COORDINATOR=url)
 * checks in here and waits; when all n shards are in - or you press Enter - all are released at once.
 *
 *   npm run perf:coordinator -- --shards=4 [--port=7777]
 */
import http from 'http';
import os from 'os';
import readline from 'readline';

function arg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  const value = hit ? Number(hit.split('=')[1]) : fallback;
  if (!Number.isFinite(value) || value < 1) throw new Error(`--${name} must be a positive number`);
  return value;
}

const shards = arg('shards', 1);
const port = arg('port', 7777);
const waiting = new Map<string, http.ServerResponse>();
let released = false;

// eslint-disable-next-line no-console
const log = (line: string) => console.log(`[coordinator ${new Date().toLocaleTimeString()}] ${line}`);

function go(reason: string): void {
  if (released) return;
  released = true;
  log(`GO (${reason}) - releasing ${waiting.size} shard(s): ${[...waiting.keys()].sort().join(', ')}`);
  waiting.forEach((res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ go: true }));
  });
  waiting.clear();
}

http
  .createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://coordinator');
    if (url.pathname !== '/ready') {
      res.writeHead(404);
      res.end();
      return;
    }
    const shard = url.searchParams.get('shard') || `anonymous-${waiting.size + 1}`;
    if (released) {
      // Late shard: start right away.
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ go: true, late: true }));
      log(`shard ${shard} checked in after GO - started immediately`);
      return;
    }
    waiting.get(shard)?.end(); // a shard that reconnects replaces its old request
    waiting.set(shard, res);
    req.on('close', () => {
      if (!released && waiting.get(shard) === res) waiting.delete(shard);
    });
    log(`shard ${shard} ready (${waiting.size}/${shards})`);
    if (waiting.size >= shards) go('all shards ready');
  })
  .listen(port, () => {
    const addresses = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === 'IPv4' && !a.internal)
      .map((a) => `http://${a!.address}:${port}`);
    log(`waiting for ${shards} shard(s) on port ${port}`);
    log(`set on every machine: PERF_COORDINATOR=${addresses[0] || `http://<this-host>:${port}`}`);
    log('press Enter to start the shards that are ready now');
  });

readline.createInterface({ input: process.stdin }).on('line', () => go('Enter pressed'));
