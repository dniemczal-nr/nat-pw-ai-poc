import http from 'http';

/** Separate one-shot barriers for login start and completion of every shard's UI work. */
export function createLoadCoordinator(shards: number, log: (message: string) => void): http.Server {
  const phases = new Map<string, { waiting: Map<string, http.ServerResponse>; released: boolean }>(
    ['/ready', '/finished'].map((phase) => [phase, { waiting: new Map(), released: false }]),
  );
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://coordinator');
    const phase = phases.get(url.pathname);
    if (!phase) {
      res.writeHead(404).end();
      return;
    }
    const shard = url.searchParams.get('shard') || '';
    const match = /^(\d+)of(\d+)$/.exec(shard);
    if (!match || Number(match[2]) !== shards || Number(match[1]) < 1 || Number(match[1]) > shards) {
      res.writeHead(400).end('Invalid shard');
      return;
    }
    if (phase.released) {
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"go":true}');
      return;
    }
    phase.waiting.get(shard)?.writeHead(409).end('Duplicate shard');
    phase.waiting.set(shard, res);
    res.on('close', () => {
      if (!phase.released && phase.waiting.get(shard) === res) phase.waiting.delete(shard);
    });
    log(`${url.pathname}: ${shard} (${phase.waiting.size}/${shards})`);
    if (phase.waiting.size === shards) {
      phase.released = true;
      phase.waiting.forEach((response) =>
        response.writeHead(200, { 'content-type': 'application/json' }).end('{"go":true}'),
      );
      phase.waiting.clear();
    }
  });
}
