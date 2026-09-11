/**
 * UI URL / headless helpers for Playwright Test.
 * Browser lifecycle is owned by @playwright/test fixtures — no launch/close here.
 */
import * as config from '../config';

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
