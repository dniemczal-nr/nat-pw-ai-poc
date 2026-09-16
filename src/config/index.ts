import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import PropertiesReader from 'properties-reader';

const ROOT_DIR = path.join(__dirname, '../..');

/**
 * Pick the env file to load, in order:
 * 1. ENV_FILE (absolute or relative to repo root)
 * 2. .env
 * 3. a single `<name>.env` in repo root (e.g. uniqa.env on a project branch)
 * Returns null when nothing matches (ENV / local.properties only).
 */
function resolveEnvFile(): string | null {
  if (process.env.ENV_FILE) {
    const explicit = path.isAbsolute(process.env.ENV_FILE)
      ? process.env.ENV_FILE
      : path.join(ROOT_DIR, process.env.ENV_FILE);
    if (!fs.existsSync(explicit)) {
      throw new Error(`Config error: ENV_FILE points to a missing file: ${explicit}`);
    }
    return explicit;
  }

  const dotEnv = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(dotEnv)) return dotEnv;

  const candidates = fs
    .readdirSync(ROOT_DIR)
    .filter((name) => name.endsWith('.env') && name !== '.env' && !name.startsWith('.'));
  if (candidates.length === 1) return path.join(ROOT_DIR, candidates[0]);
  if (candidates.length > 1) {
    throw new Error(
      `Config error: multiple *.env files in repo root (${candidates.join(', ')}). ` +
        'Set ENV_FILE to choose one.',
    );
  }
  return null;
}

/** Env file actually loaded (for config:print / debugging). */
export const ENV_FILE_LOADED: string | null = resolveEnvFile();

// Load env file before reading properties so ${ENV} placeholders and key overlays work.
if (ENV_FILE_LOADED) {
  dotenv.config({ path: ENV_FILE_LOADED });
}

const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const DEFAULT_FILE = path.join(CONFIG_DIR, 'default.properties');
const LOCAL_FILE = path.join(CONFIG_DIR, 'local.properties');

type ConfigStore = Record<string, string>;

function loadPropertiesFile(filePath: string): ConfigStore | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const reader = PropertiesReader(filePath);
  const allProps = reader.getAllProperties();
  const flat: ConfigStore = {};
  Object.keys(allProps).forEach((key) => {
    flat[key] = String(allProps[key]);
  });
  return flat;
}

function overlay(base: ConfigStore, override: ConfigStore | null | undefined): ConfigStore {
  if (!override) return base;
  return { ...base, ...override };
}

/**
 * Expand ${token} using config map first, then process.env.
 * Leaves unresolved tokens as-is (callers may detect remaining ${}).
 */
function interpolate(store: ConfigStore): ConfigStore {
  const maxPasses = 10;
  let result: ConfigStore = { ...store };

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    Object.keys(result).forEach((key) => {
      const raw = result[key];
      if (!raw.includes('${')) return;

      const next = raw.replace(/\$\{([^}]+)\}/g, (match, token: string) => {
        if (Object.prototype.hasOwnProperty.call(result, token) && result[token] != null) {
          return String(result[token]);
        }
        if (Object.prototype.hasOwnProperty.call(process.env, token) && process.env[token] != null) {
          return String(process.env[token]);
        }
        return match;
      });

      if (next !== raw) {
        result[key] = next;
        changed = true;
      }
    });
    if (!changed) break;
  }

  return result;
}

function buildConfig(): ConfigStore {
  if (!fs.existsSync(DEFAULT_FILE)) {
    throw new Error(`Config error: missing default properties file at ${DEFAULT_FILE}`);
  }

  let combined = loadPropertiesFile(DEFAULT_FILE) || {};

  const local = loadPropertiesFile(LOCAL_FILE);
  if (local) {
    combined = overlay(combined, local);
  }

  if (process.env.APPLICATION_ENVIRONMENT) {
    combined['application.environment'] = process.env.APPLICATION_ENVIRONMENT;
  }

  const envOverrides: ConfigStore = {};
  Object.keys(process.env).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(combined, key) && process.env[key] != null) {
      envOverrides[key] = String(process.env[key]);
    }
  });

  combined = overlay(combined, envOverrides);
  return interpolate(combined);
}

const configStore = buildConfig();

export function get(key: string): string | undefined {
  return configStore[key];
}

export function has(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(configStore, key);
}

export function getOrDefault(key: string, defaultValue: string): string {
  if (has(key) && configStore[key] !== undefined) {
    return configStore[key];
  }
  return defaultValue;
}

/** Raw store for debugging / config:print */
export const _all: ConfigStore = configStore;

const config = { get, has, getOrDefault, _all };
export default config;
