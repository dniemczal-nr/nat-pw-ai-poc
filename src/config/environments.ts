import fs from 'fs';
import path from 'path';

/** Environment alias files: config/environments/<alias>.env (example.env is the tracked template). */
export const ENVIRONMENTS_DIR = path.join(__dirname, '../../config/environments');

/**
 * Aliases available on disk. Kept apart from src/config/index.ts so scripts can list aliases
 * without triggering config resolution.
 */
export function listEnvironmentAliases(): string[] {
  if (!fs.existsSync(ENVIRONMENTS_DIR)) return [];
  return fs
    .readdirSync(ENVIRONMENTS_DIR)
    .filter((name) => name.endsWith('.env') && name !== 'example.env')
    .map((name) => name.slice(0, -'.env'.length))
    .sort();
}
