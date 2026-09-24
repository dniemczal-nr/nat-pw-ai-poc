import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export type EnvSource = 'root' | 'imported';

/** An environment file the dashboard can hand to Playwright via ENV_FILE. Values are never exposed. */
export type EnvItem = {
  id: string;
  name: string;
  source: EnvSource;
  /** Path relative to the repo root. */
  file: string;
  keys: string[];
  modifiedAt: string;
};

export type ResolvedPreview = {
  ok: boolean;
  envFile: string | null;
  values: Record<string, string | undefined>;
  error?: string;
};

const ENV_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$/;
const MAX_CONTENT = 64 * 1024;
const PREVIEW_KEYS = [
  'application.environment',
  'ProjectName',
  'ui.baseUrl',
  'app.baseUrl',
  'api.baseUrl',
  'ssh.host',
  'ssh.user',
  'userDataAdminUsername',
];

export class EnvStore {
  readonly importedDir: string;

  constructor(private readonly root: string, natDir: string) {
    this.importedDir = path.join(natDir, 'envs');
    fs.mkdirSync(this.importedDir, { recursive: true });
  }

  list(): EnvItem[] {
    const items: EnvItem[] = [];
    for (const name of fs.readdirSync(this.root)) {
      if (name === '.env' || (name.endsWith('.env') && !name.startsWith('.'))) {
        const item = this.describe('root', path.join(this.root, name));
        if (item) items.push(item);
      }
    }
    for (const name of fs.readdirSync(this.importedDir)) {
      if (name.endsWith('.env')) {
        const item = this.describe('imported', path.join(this.importedDir, name));
        if (item) items.push(item);
      }
    }
    return items.sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name));
  }

  find(id: string): EnvItem | null {
    return this.list().find((e) => e.id === id) ?? null;
  }

  absolutePath(item: EnvItem): string {
    return path.join(this.root, item.file);
  }

  /** Import a dotenv document as `.nat/envs/<name>.env`. Returns the stored item. */
  import(name: unknown, content: unknown, overwrite: boolean): EnvItem | { error: string; status: number } {
    if (typeof name !== 'string' || !ENV_NAME.test(name)) {
      return { error: 'name must be 1–41 characters: letters, digits, dot, dash or underscore', status: 400 };
    }
    if (typeof content !== 'string' || !content.trim()) return { error: 'content must be a non-empty dotenv document', status: 400 };
    if (content.length > MAX_CONTENT) return { error: 'content exceeds 64 KB', status: 400 };

    const parsed = dotenv.parse(content);
    const keys = Object.keys(parsed);
    if (!keys.length) return { error: 'No KEY=value pairs found — expected the .env.example format', status: 400 };

    const target = path.join(this.importedDir, `${name}.env`);
    if (fs.existsSync(target) && !overwrite) return { error: `Environment "${name}" already exists`, status: 409 };
    fs.writeFileSync(target, content.endsWith('\n') ? content : `${content}\n`, { mode: 0o600 });
    const item = this.describe('imported', target);
    return item ?? { error: 'Import failed', status: 500 };
  }

  /** Only imported files can be removed; repo-root env files are the user's own. */
  remove(id: string): boolean {
    const item = this.find(id);
    if (!item || item.source !== 'imported') return false;
    fs.rmSync(this.absolutePath(item));
    return true;
  }

  /** Resolve the framework config in a child process so the dashboard's own env stays untouched. */
  resolve(envFile: string | null): Promise<ResolvedPreview> {
    return new Promise((resolve) => {
      const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: '0' };
      if (envFile) env.ENV_FILE = envFile;
      const child = spawn(
        path.join(this.root, 'node_modules', '.bin', 'tsx'),
        [path.join(__dirname, 'resolveConfig.ts'), ...PREVIEW_KEYS],
        { cwd: this.root, env },
      );
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
      child.on('error', (e) => resolve({ ok: false, envFile, values: {}, error: e.message }));
      child.on('close', (code) => {
        try {
          const start = out.indexOf('{');
          if (code !== 0 || start === -1) throw new Error(firstLine(err || out) || `exit ${code}`);
          const data = JSON.parse(out.slice(start)) as { envFile: string | null; values: Record<string, string | undefined> };
          resolve({ ok: true, envFile: data.envFile, values: data.values });
        } catch (e) {
          resolve({ ok: false, envFile, values: {}, error: (e as Error).message });
        }
      });
    });
  }

  private describe(source: EnvSource, file: string): EnvItem | null {
    try {
      const stat = fs.statSync(file);
      const base = path.basename(file);
      return {
        id: `${source}/${base}`,
        name: base === '.env' ? '.env' : base.replace(/\.env$/, ''),
        source,
        file: path.relative(this.root, file).split(path.sep).join('/'),
        keys: Object.keys(dotenv.parse(fs.readFileSync(file, 'utf8'))).sort(),
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }
}

function firstLine(text: string): string {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /error/i.test(l)) ?? text.trim().split('\n')[0] ?? '';
  return line.replace(/^\S*Error:\s*/, '').slice(0, 300);
}
