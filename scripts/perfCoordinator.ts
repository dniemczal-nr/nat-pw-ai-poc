/**
 * On-demand start for multi-machine perf runs: every shard (PERF_SHARD=i/n, PERF_COORDINATOR=url)
 * checks in here and waits for all n shards. A second barrier holds logout until all work finishes.
 *
 *   npm run perf:coordinator -- --shards=4 [--port=7777]
 */
import os from 'os';
import { createLoadCoordinator } from '../src/perf/coordinator';

function arg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  const value = hit ? Number(hit.split('=')[1]) : fallback;
  if (!Number.isFinite(value) || value < 1) throw new Error(`--${name} must be a positive number`);
  return value;
}

const shards = arg('shards', 1);
const port = arg('port', 7777);

// eslint-disable-next-line no-console
const log = (line: string) => console.log(`[coordinator ${new Date().toLocaleTimeString()}] ${line}`);

createLoadCoordinator(shards, log)
  .listen(port, () => {
    const addresses = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === 'IPv4' && !a.internal)
      .map((a) => `http://${a!.address}:${port}`);
    log(`waiting for ${shards} shard(s) on port ${port}`);
    log(`set on every machine: PERF_COORDINATOR=${addresses[0] || `http://<this-host>:${port}`}`);
    log('logout is released only after every shard has completed its UI work');
  });
