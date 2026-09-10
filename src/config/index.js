// src/config/index.js
// CommonJS config loader: default.properties → local.properties → ENV, then ${…} interpolate

const fs = require('fs');
const path = require('path');
const PropertiesReader = require('properties-reader');

const CONFIG_DIR = path.join(__dirname, '../../config');
const DEFAULT_FILE = path.join(CONFIG_DIR, 'default.properties');
const LOCAL_FILE = path.join(CONFIG_DIR, 'local.properties');

function loadPropertiesFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const reader = PropertiesReader(filePath);
  const allProps = reader.getAllProperties();
  const flat = {};
  Object.keys(allProps).forEach((key) => {
    flat[key] = String(allProps[key]);
  });
  return flat;
}

function overlay(base, override) {
  if (!override) return base;
  return Object.assign({}, base, override);
}

/**
 * Expand ${token} using config map first, then process.env.
 * Leaves unresolved tokens as-is (callers may detect remaining ${}).
 */
function interpolate(store) {
  const maxPasses = 10;
  let result = Object.assign({}, store);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    Object.keys(result).forEach((key) => {
      const raw = result[key];
      if (typeof raw !== 'string' || !raw.includes('${')) return;

      const next = raw.replace(/\$\{([^}]+)\}/g, (match, token) => {
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

function buildConfig() {
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

  const envOverrides = {};
  Object.keys(process.env).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(combined, key)) {
      envOverrides[key] = process.env[key];
    }
  });

  combined = overlay(combined, envOverrides);
  return interpolate(combined);
}

const configStore = buildConfig();

function get(key) {
  return configStore[key];
}

function has(key) {
  return Object.prototype.hasOwnProperty.call(configStore, key);
}

function getOrDefault(key, defaultValue) {
  if (has(key)) {
    return configStore[key];
  }
  return defaultValue;
}

module.exports = {
  get,
  has,
  getOrDefault,
  _all: configStore,
};
