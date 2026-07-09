'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../reports/logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  return LOG_DIR;
}

function createLogger(scenarioName) {
  const dir = ensureLogDir();
  const safeName = (scenarioName || 'scenario').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${safeName}_${timestamp}.log`);

  const stream = fs.createWriteStream(filePath, { flags: 'a' });

  function log(...args) {
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const line = `[${new Date().toISOString()}] ${message}`;
    // Console
    // eslint-disable-next-line no-console
    console.log(line);
    // File
    stream.write(`${line}\n`);
  }

  function close() {
    stream.end();
  }

  return { log, close, filePath };
}

module.exports = {
  createLogger,
};
