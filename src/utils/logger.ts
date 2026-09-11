import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../reports/logs');

export type Logger = {
  log: (...args: unknown[]) => void;
  close: () => void;
  filePath: string;
};

function ensureLogDir(): string {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  return LOG_DIR;
}

export function createLogger(scenarioName?: string): Logger {
  const dir = ensureLogDir();
  const safeName = (scenarioName || 'scenario').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${safeName}_${timestamp}.log`);

  const stream = fs.createWriteStream(filePath, { flags: 'a' });

  function log(...args: unknown[]): void {
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const line = `[${new Date().toISOString()}] ${message}`;
    // eslint-disable-next-line no-console
    console.log(line);
    stream.write(`${line}\n`);
  }

  function close(): void {
    stream.end();
  }

  return { log, close, filePath };
}
