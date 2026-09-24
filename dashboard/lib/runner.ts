import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { childEnv, playwrightCli } from './testList';
import {
  renderReportHtml,
  summarize,
  type JsonResults,
  type RunMeta,
  type RunSelection,
  type RunSummary,
} from './report';

export type RunEvent =
  | { type: 'line'; text: string }
  | { type: 'done'; exitCode: number | null; summary: RunSummary | null };

export type RunListItem = {
  meta: RunMeta;
  totals: RunSummary['totals'] | null;
  durationMs: number | null;
  running: boolean;
};

type Listener = (event: RunEvent) => void;

const MAX_BUFFERED_LINES = 5000;

class ActiveRun {
  readonly lines: string[] = [];
  readonly listeners = new Set<Listener>();
  private partial = '';
  private readonly log: fs.WriteStream;
  stopped = false;

  constructor(
    readonly meta: RunMeta,
    readonly dir: string,
    readonly child: ChildProcess,
  ) {
    this.log = fs.createWriteStream(path.join(dir, 'stdout.log'), { flags: 'a' });
  }

  feed(chunk: Buffer): void {
    this.partial += chunk.toString('utf8');
    const parts = this.partial.split(/\r?\n/);
    this.partial = parts.pop() ?? '';
    for (const line of parts) this.push(line);
  }

  flush(): void {
    if (this.partial) {
      this.push(this.partial);
      this.partial = '';
    }
  }

  private push(line: string): void {
    this.log.write(`${line}\n`);
    this.lines.push(line);
    if (this.lines.length > MAX_BUFFERED_LINES) this.lines.shift();
    this.emit({ type: 'line', text: line });
  }

  emit(event: RunEvent): void {
    for (const l of this.listeners) l(event);
  }

  closeLog(): Promise<void> {
    return new Promise((resolve) => this.log.end(resolve));
  }
}

export class RunManager {
  private active: ActiveRun | null = null;

  constructor(
    private readonly cwd: string,
    private readonly runsDir: string,
  ) {
    fs.mkdirSync(runsDir, { recursive: true });
  }

  get activeId(): string | null {
    return this.active?.meta.id ?? null;
  }

  start(selection: RunSelection): RunMeta {
    if (this.active) {
      throw new Error(`Run ${this.active.meta.id} is still in progress`);
    }
    const id = this.newRunId();
    const dir = path.join(this.runsDir, id);
    fs.mkdirSync(dir, { recursive: true });

    const meta: RunMeta = { id, startedAt: new Date().toISOString(), selection };
    writeJson(path.join(dir, 'meta.json'), meta);

    const args = [playwrightCli(this.cwd), 'test', ...selection.files, ...selection.locations];
    for (const p of selection.projects) args.push(`--project=${p}`);
    if (selection.workers !== null) args.push(`--workers=${selection.workers}`);
    if (selection.grep) args.push(`--grep=${selection.grep}`);
    args.push('--reporter=list,json,html');

    const htmlDir = path.join(dir, 'html');
    const child = spawn(process.execPath, args, {
      cwd: this.cwd,
      env: childEnv({
        PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(dir, 'results.json'),
        PLAYWRIGHT_HTML_OUTPUT_DIR: htmlDir,
        PLAYWRIGHT_HTML_REPORT: htmlDir,
        PLAYWRIGHT_HTML_OPEN: 'never',
      }),
    });

    const run = new ActiveRun(meta, dir, child);
    this.active = run;
    run.feed(Buffer.from(`$ playwright ${args.slice(1).join(' ')}\n`));
    child.stdout?.on('data', (d: Buffer) => run.feed(d));
    child.stderr?.on('data', (d: Buffer) => run.feed(d));
    child.on('error', (err) => run.feed(Buffer.from(`[nat] failed to start Playwright: ${err.message}\n`)));
    child.on('close', (code) => void this.finish(run, code));
    return meta;
  }

  stop(): boolean {
    if (!this.active) return false;
    this.active.stopped = true;
    this.active.feed(Buffer.from('[nat] stop requested — sending SIGTERM\n'));
    this.active.child.kill('SIGTERM');
    return true;
  }

  /** Replays buffered output for the active run, then streams live events. */
  subscribe(id: string, listener: Listener): (() => void) | null {
    const run = this.active;
    if (!run || run.meta.id !== id) return null;
    for (const text of run.lines) listener({ type: 'line', text });
    run.listeners.add(listener);
    return () => run.listeners.delete(listener);
  }

  listRuns(): RunListItem[] {
    if (!fs.existsSync(this.runsDir)) return [];
    const items: RunListItem[] = [];
    for (const id of fs.readdirSync(this.runsDir).sort().reverse()) {
      const meta = readJson<RunMeta>(path.join(this.runsDir, id, 'meta.json'));
      if (!meta) continue;
      const summary = readJson<RunSummary>(path.join(this.runsDir, id, 'summary.json'));
      items.push({
        meta,
        totals: summary?.totals ?? null,
        durationMs: summary?.durationMs ?? null,
        running: this.active?.meta.id === id,
      });
    }
    return items;
  }

  readSummary(id: string): RunSummary | null {
    return readJson<RunSummary>(path.join(this.runsDir, id, 'summary.json'));
  }

  runDir(id: string): string {
    return path.join(this.runsDir, id);
  }

  private async finish(run: ActiveRun, exitCode: number | null): Promise<void> {
    run.flush();
    const meta: RunMeta = {
      ...run.meta,
      finishedAt: new Date().toISOString(),
      exitCode,
      stopped: run.stopped || undefined,
    };
    writeJson(path.join(run.dir, 'meta.json'), meta);

    const results = readJson<JsonResults>(path.join(run.dir, 'results.json'));
    const hasNativeReport = fs.existsSync(path.join(run.dir, 'html', 'index.html'));
    let summary: RunSummary | null = null;
    try {
      summary = summarize(results, meta, this.cwd, hasNativeReport);
      writeJson(path.join(run.dir, 'summary.json'), summary);
      fs.writeFileSync(path.join(run.dir, 'report.html'), renderReportHtml(summary));
      run.feed(Buffer.from(`[nat] report written: .nat/runs/${meta.id}/report.html\n`));
    } catch (err) {
      run.feed(Buffer.from(`[nat] could not build report: ${(err as Error).message}\n`));
    }
    run.flush();
    await run.closeLog();
    run.emit({ type: 'done', exitCode, summary });
    run.listeners.clear();
    if (this.active === run) this.active = null;
  }

  private newRunId(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const base = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    let id = base;
    for (let i = 2; fs.existsSync(path.join(this.runsDir, id)); i++) id = `${base}-${i}`;
    return id;
  }
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}
