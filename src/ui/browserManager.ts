/**
 * UI URL / headless helpers for Playwright Test.
 * Browser lifecycle is owned by @playwright/test fixtures — no launch/close here.
 * Hostnames come from config (multi-project); no customer DNS hardcoding.
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
  return config.getOrDefault('ui.basePath', '/netreveal/login.do');
}

/**
 * Fully resolved UI login URL after config ${…} interpolation.
 * Set `ui.baseUrl` (or overlay / ENV) per NR project — unresolved placeholders fail fast.
 */
export function resolveBaseUrl(): string {
  const baseUrl = config.getOrDefault('ui.baseUrl', '');
  if (!baseUrl || baseUrl.includes('${')) {
    throw new Error(
      `ui.baseUrl is missing or still contains unresolved placeholders: "${baseUrl}". ` +
        'Set ui.baseUrl / dns.domain / application.environment via config/local.properties or ENV.',
    );
  }
  return baseUrl;
}

/** Origin only (scheme + host + port) for Playwright `use.baseURL`. */
export function resolveOrigin(): string {
  const url = new URL(resolveBaseUrl());
  return url.origin;
}
