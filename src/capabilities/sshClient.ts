import fs from 'fs';
import path from 'path';
import { Client } from 'ssh2';
import * as config from '../config';

export type SshExecResult = {
  stdout: string;
  stderr: string;
  code: number;
};

function requireConfigValue(key: string): string {
  const value = config.get(key);
  if (!value || value.includes('${')) {
    throw new Error(
      `SSH config error: missing or unresolved "${key}" (got: "${value}"). ` +
        'Set via config/local.properties or ENV (e.g. SSH_KEYFILE, ssh.host).',
    );
  }
  return value;
}

/**
 * SSH capability for batch / non-UI checks (Playwright project `ssh`).
 */
export class SshClient {
  assertConfigured(): { host: string; user: string; keyFile: string; port: number } {
    const host = requireConfigValue('ssh.host');
    const user = requireConfigValue('ssh.user');
    const keyFile = requireConfigValue('ssh.keyFile');
    const port = Number(config.getOrDefault('ssh.port', '22'));
    return { host, user, keyFile, port };
  }

  /**
   * Execute a single command over SSH.
   */
  async exec(command: string): Promise<SshExecResult> {
    if (!command || typeof command !== 'string') {
      throw new Error('SSH exec: command must be a non-empty string');
    }

    const { host, user, keyFile, port } = this.assertConfigured();

    const resolvedKeyPath = path.isAbsolute(keyFile)
      ? keyFile
      : path.resolve(process.cwd(), keyFile);

    let privateKey: Buffer;
    try {
      privateKey = fs.readFileSync(resolvedKeyPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`SSH key error: unable to read key file at ${resolvedKeyPath}: ${message}`);
    }

    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';

      const handleError = (err: Error) => {
        conn.end();
        reject(new Error(`SSH connection error: ${err.message}`));
      };

      conn
        .on('error', handleError)
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              return reject(new Error(`SSH exec error: ${err.message}`));
            }

            stream
              .on('close', (code: number | null) => {
                conn.end();
                resolve({
                  stdout,
                  stderr,
                  code: typeof code === 'number' ? code : -1,
                });
              })
              .on('data', (data: Buffer) => {
                stdout += data.toString();
              });

            stream.stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });
          });
        });

      conn.connect({
        host,
        port,
        username: user,
        privateKey,
      });
    });
  }
}

/** Convenience singleton for scripts */
export const sshClient = new SshClient();

export async function exec(command: string): Promise<SshExecResult> {
  return sshClient.exec(command);
}
