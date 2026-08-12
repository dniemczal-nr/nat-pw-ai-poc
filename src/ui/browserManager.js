'use strict';

const { chromium, firefox, webkit } = require('playwright');
const path = require('path');
const fs = require('fs');
const config = require('../config');

function resolveBrowserType() {
  const type = (config.getOrDefault('ui.browser', 'chromium') || 'chromium').toLowerCase();
  switch (type) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    case 'chromium':
    default:
      return chromium;
  }
}

function resolveHeadless() {
  const raw = config.getOrDefault('ui.headless', 'true');
  if (typeof raw === 'boolean') return raw;
  return String(raw).toLowerCase() !== 'false';
}

function resolveBasePath() {
  return config.getOrDefault('ui.basePath', '/');
}

/**
 * Fully resolved UI login URL (placeholders expanded from application.environment / port).
 * Shared by Cucumber launch and Playwright Test baseURL / auth setup.
 */
function resolveBaseUrl() {
  const baseUrl = config.getOrDefault('ui.baseUrl', 'http://localhost');
  const basePath = resolveBasePath();
  const env = config.getOrDefault('application.environment', 'qa2');
  const port = config.getOrDefault('application.port', '24200');

  if (baseUrl && baseUrl.includes('${')) {
    return `https://ui-lb.${env}.reyl.fs.caws.local:${port}${basePath}`;
  }

  return baseUrl || `https://ui-lb.${env}.reyl.fs.caws.local:${port}${basePath}`;
}

/**
 * Origin only (scheme + host + port) for Playwright `use.baseURL`.
 */
function resolveOrigin() {
  try {
    const url = new URL(resolveBaseUrl());
    return url.origin;
  } catch {
    const env = config.getOrDefault('application.environment', 'qa2');
    const port = config.getOrDefault('application.port', '24200');
    return `https://ui-lb.${env}.reyl.fs.caws.local:${port}`;
  }
}

function ensureScreenshotDir() {
  const dir = path.join(__dirname, '../../reports/screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Cucumber / @legacy-ui path only. Playwright Test owns browser lifecycle via fixtures.
 */
async function launchBrowser() {
  const browserType = resolveBrowserType();
  const headless = resolveHeadless();
  const browser = await browserType.launch({ headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const targetUrl = resolveBaseUrl();
  if (targetUrl) {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }

  return { browser, context, page };
}

async function closeBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}

async function takeScreenshot(page, world, suffix) {
  if (!page) return null;

  const dir = ensureScreenshotDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const env = (world && world.environment) || config.getOrDefault('application.environment', 'local');
  const scenarioName = (world && world.scenarioName) || 'scenario';
  const safeName = scenarioName.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const extra = suffix ? `_${suffix}` : '';

  const fileName = `${safeName}_${env}_${timestamp}${extra}.png`;
  const fullPath = path.join(dir, fileName);

  await page.screenshot({ path: fullPath, fullPage: true });
  return fullPath;
}

module.exports = {
  resolveBaseUrl,
  resolveOrigin,
  resolveBasePath,
  resolveHeadless,
  launchBrowser,
  closeBrowser,
  takeScreenshot,
};
