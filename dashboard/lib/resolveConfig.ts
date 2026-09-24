/**
 * Child-process entry for the dashboard: resolve the framework config for the current
 * ENV_FILE and print only the requested (non-secret) keys as JSON.
 */
import * as config from '../../src/config';

const keys = process.argv.slice(2);
const values: Record<string, string | undefined> = {};
for (const key of keys) values[key] = config.get(key);

process.stdout.write(JSON.stringify({ envFile: config.ENV_FILE_LOADED, values }));
