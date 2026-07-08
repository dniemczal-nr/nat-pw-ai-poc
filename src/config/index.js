// src/config/index.js
// CommonJS config loader using properties-reader

const fs = require('fs');
const path = require('path');
const PropertiesReader = require('properties-reader');

const CONFIG_DIR = path.join(__dirname, '../../config');
const DEFAULT_FILE = path.join(CONFIG_DIR, 'default.properties');

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

function buildConfig() {
  if (!fs.existsSync(DEFAULT_FILE)) {
    throw new Error(`Config error: missing default properties file at ${DEFAULT_FILE}`);
  }

  // Phase 2: single-file baseline (default.properties) plus ENV overrides
  const defaultConfig = loadPropertiesFile(DEFAULT_FILE);

  let combined = defaultConfig;

  // Map APPLICATION_ENVIRONMENT (shell-safe) to application.environment (config key)
  if (process.env.APPLICATION_ENVIRONMENT) {
    combined['application.environment'] = process.env.APPLICATION_ENVIRONMENT;
  }

  // Overlay process.env on top (only keys that already exist in the combined config)
  const envOverrides = {};
  Object.keys(process.env).forEach((key) => {
    // For now, we only support exact matches: if process.env has the same key
    // as the property (e.g. "app.baseUrl"), it overrides.
    if (combined.hasOwnProperty(key)) {
      envOverrides[key] = process.env[key];
    }
  });

  combined = overlay(combined, envOverrides);

  return combined;
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
  // Expose raw store for debugging if needed
  _all: configStore,
};
