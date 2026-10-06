/**
 * Merge perf runs executed at the same time on several machines (scale-out beyond what one
 * machine's browser contexts can carry) into one result.
 *
 *   npm run perf:merge -- <runDir> <runDir> [...] [--out=reports/perf/<name>]
 *
 * Each <runDir> is a reports/perf/<runId>/ folder (copied from the other machines).
 * Virtual-user numbers are renumbered so they stay unique across runs.
 */
import fs from 'fs';
import path from 'path';
import { summarize, summaryMarkdown, type PerfSummary } from '../src/perf/stats';
import type { Measurement } from '../src/perf/types';

function main(): void {
  const args = process.argv.slice(2);
  const dirs = args.filter((a) => !a.startsWith('--'));
  if (dirs.length < 2) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run perf:merge -- <runDir> <runDir> [...] [--out=reports/perf/<name>]');
    process.exit(2);
  }

  const runs = dirs.map((dir) => {
    const file = path.resolve(process.cwd(), dir, 'measurements.json');
    if (!fs.existsSync(file)) throw new Error(`perf:merge: missing ${file}`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Measurement[];
  });
  // PERF_SHARD runs already use global virtual-user numbers; renumber only if they collide.
  const seen = new Set<number>();
  const collide = runs.some((rows) => {
    const vus = new Set(rows.map((m) => m.virtualUser).filter((v) => v > 0));
    const hit = [...vus].some((v) => seen.has(v));
    vus.forEach((v) => seen.add(v));
    return hit;
  });
  const merged: Measurement[] = [];
  let offset = 0;
  for (const rows of runs) {
    const maxVu = Math.max(0, ...rows.map((m) => m.virtualUser));
    merged.push(...rows.map((m) => (collide && m.virtualUser > 0 ? { ...m, virtualUser: m.virtualUser + offset } : m)));
    offset += maxVu;
  }
  const totalVus = new Set(merged.map((m) => m.virtualUser).filter((v) => v > 0)).size;

  const outArg = args.find((a) => a.startsWith('--out='));
  const outDir = path.resolve(process.cwd(), outArg ? outArg.split('=')[1] : `reports/perf/merged_${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  const releases = [...new Set(merged.map((m) => m.release))];
  const summary: PerfSummary = {
    release: releases.join('+'),
    runId: path.basename(outDir),
    generatedAt: new Date().toISOString(),
    virtualUsers: totalVus,
    screens: summarize(merged),
  };
  fs.writeFileSync(path.join(outDir, 'measurements.json'), JSON.stringify(merged));
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  const markdown = `${summaryMarkdown(summary)}\n\nMerged from: ${dirs.join(', ')}\n`;
  fs.writeFileSync(path.join(outDir, 'summary.md'), markdown);
  // eslint-disable-next-line no-console
  console.log(`${markdown}\nMerged results: ${outDir}`);
}

main();
