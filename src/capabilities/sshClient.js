// src/capabilities/sshClient.js
// Minimal SSH client using ssh2 and existing config layer

const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const config = require('../config');

/**
 * Execute a single command over SSH using configuration values.
 *
 * Required config keys:
 *   - ssh.host
 *   - ssh.user
 *   - ssh.keyFile (path to private key file, workspace-relative or absolute)
 * Optional:
 *   - ssh.port (default 22)
 *
 * @param {string} command
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
async function exec(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('SSH exec: command must be a non-empty string');
  }

  const host = config.get('ssh.host');
  const user = config.get('ssh.user');
  const keyFile = config.get('ssh.keyFile');
  const port = Number(config.getOrDefault('ssh.port', 22));

  if (!host) {
    throw new Error('SSH config error: missing required key "ssh.host"');
  }
  if (!user) {
    throw new Error('SSH config error: missing required key "ssh.user"');
  }
  if (!keyFile) {
    throw new Error('SSH config error: missing required key "ssh.keyFile"');
  }

  // Allow workspace-relative paths in config; resolve against process.cwd().
  const resolvedKeyPath = path.isAbsolute(keyFile)
    ? keyFile
    : path.resolve(process.cwd(), keyFile);

  let privateKey;
  try {
    privateKey = fs.readFileSync(resolvedKeyPath);
  } catch (err) {
    throw new Error(
      `SSH key error: unable to read key file at ${resolvedKeyPath}: ${err.message}`,
    );
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();

    let stdout = '';
    let stderr = '';

    const handleError = (err) => {
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
            .on('close', (code) => {
              conn.end();
              resolve({
                stdout,
                stderr,
                code: typeof code === 'number' ? code : -1,
              });
            })
            .on('data', (data) => {
              stdout += data.toString();
            })
            .stderr.on('data', (data) => {
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

module.exports = {
  exec,
};
