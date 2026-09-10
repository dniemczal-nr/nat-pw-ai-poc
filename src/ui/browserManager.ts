/**
 * UI URL / headless helpers for Playwright Test.
 * Browser lifecycle is owned by @playwright/test fixtures — no launch/close here.
 */

// Shared CJS config (SSH Cucumber path still uses the same module).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../config') as {
  getOrDefault(key: string, defaultValue: string): string;
};

export function resolveHeadless(): boolean {
  const raw = config.getOrDefault('ui.headless', 'true');
  return String(raw).toLowerCase() !== 'false';
}

export function resolveBasePath(): string {
  return config.getOrDefault('ui.basePath', '/');
}

/**
 * Fully resolved UI login URL (placeholders expanded from application.environment / port).
 */
export function resolveBaseUrl(): string {
  const baseUrl = config.getOrDefault('ui.baseUrl', 'http://localhost');
  const basePath = resolveBasePath();
  const env = config.getOrDefault('application.environment', 'qa2');
  const port = config.getOrDefault('application.port', '24200');

  if (baseUrl && baseUrl.includes('${')) {
    return `https://ui-lb.${env}.reyl.fs.caws.local:${port}${basePath}`;
  }

  return baseUrl || `https://ui-lb.${env}.reyl.fs.caws.local:${port}${basePath}`;
}

/** Origin only (scheme + host + port) for Playwright `use.baseURL`. */
export function resolveOrigin(): string {
  try {
    const url = new URL(resolveBaseUrl());
    return url.origin;
  } catch {
    const env = config.getOrDefault('application.environment', 'qa2');
    const port = config.getOrDefault('application.port', '24200');
    return `https://ui-lb.${env}.reyl.fs.caws.local:${port}`;
  }
}
