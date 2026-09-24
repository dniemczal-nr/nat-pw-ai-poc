import { spawn } from 'node:child_process';
import path from 'node:path';

export type SpecEntry = {
  id: string;
  title: string;
  /** Enclosing describe titles, outermost first. */
  titlePath: string[];
  line: number;
  tags: string[];
  projects: string[];
};

export type FileEntry = {
  /** Path relative to the repo root, e.g. `tests/ui/seed.spec.ts`. */
  file: string;
  specs: SpecEntry[];
};

export type TestInventory = {
  projects: string[];
  files: FileEntry[];
  total: number;
  generatedAt: string;
};

type JsonSuite = {
  title: string;
  file?: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
};

type JsonSpec = {
  id: string;
  title: string;
  file: string;
  line: number;
  tags?: string[];
  tests?: { projectName: string }[];
};

type JsonList = {
  config: { rootDir: string; projects: { name: string }[] };
  suites: JsonSuite[];
};

export function playwrightCli(cwd: string): string {
  return require.resolve('@playwright/test/cli', { paths: [cwd] });
}

/** Env for child Playwright processes: plain output, no stray reporter overrides. */
export function childEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: '0', CI: undefined, ...extra };
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) delete env[key];
  }
  return env;
}

export async function listTests(cwd: string): Promise<TestInventory> {
  const raw = await runList(cwd);
  const data = JSON.parse(raw) as JsonList;
  const rootDir = data.config.rootDir;

  // `--list` emits one spec entry per project; merge them into a single row per (file, line, title).
  const byFile = new Map<string, Map<string, SpecEntry>>();
  // Root suites are titled after the file; only nested describes contribute to titlePath.
  const walk = (suite: JsonSuite, ancestors: string[], isRoot: boolean): void => {
    const nextAncestors = isRoot ? [] : [...ancestors, suite.title];
    for (const spec of suite.specs ?? []) {
      const file = path.relative(cwd, path.join(rootDir, spec.file)).split(path.sep).join('/');
      const specs = byFile.get(file) ?? new Map<string, SpecEntry>();
      const key = `${spec.line}:${nextAncestors.join('/')}:${spec.title}`;
      const projects = (spec.tests ?? []).map((t) => t.projectName);
      const existing = specs.get(key);
      if (existing) {
        existing.projects = [...new Set([...existing.projects, ...projects])];
      } else {
        specs.set(key, {
          id: spec.id,
          title: spec.title,
          titlePath: nextAncestors.filter((t) => t.length > 0),
          line: spec.line,
          tags: spec.tags ?? [],
          projects: [...new Set(projects)],
        });
      }
      byFile.set(file, specs);
    }
    for (const child of suite.suites ?? []) walk(child, nextAncestors, false);
  };
  for (const root of data.suites) walk(root, [], true);

  // Auth setup is dependency plumbing — Playwright runs it implicitly, so it is never a target.
  const files: FileEntry[] = [];
  for (const [file, specs] of byFile) {
    const rows = [...specs.values()].filter((s) => s.projects.some((p) => p !== 'setup'));
    if (rows.length) files.push({ file, specs: rows.sort((a, b) => a.line - b.line) });
  }
  files.sort((a, b) => a.file.localeCompare(b.file));

  return {
    projects: data.config.projects.map((p) => p.name),
    files,
    total: files.reduce((n, f) => n + f.specs.length, 0),
    generatedAt: new Date().toISOString(),
  };
}

function runList(cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [playwrightCli(cwd), 'test', '--list', '--reporter=json'],
      { cwd, env: childEnv({ PLAYWRIGHT_JSON_OUTPUT_NAME: undefined }) },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      // The JSON reporter prints a single document; anything before "{" is runner noise.
      const start = out.indexOf('{');
      if (start === -1) {
        reject(new Error(`playwright --list produced no JSON (exit ${code}).\n${err || out}`));
        return;
      }
      resolve(out.slice(start));
    });
  });
}
