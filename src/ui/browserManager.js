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

function resolveBaseUrl() {
  return config.getOrDefault('ui.baseUrl', 'http://localhost');
}

function resolveBasePath() {
  return config.getOrDefault('ui.basePath', '/');
}

function ensureScreenshotDir() {
  const dir = path.join(__dirname, '../../reports/screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function launchBrowser() {
  const browserType = resolveBrowserType();
  const headless = resolveHeadless();
  const browser = await browserType.launch({ headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const baseUrl = resolveBaseUrl();
  const basePath = resolveBasePath();

  // If ui.baseUrl contains unresolved placeholders, build it explicitly from
  // application.environment, application.port and ui.basePath.
  const env = config.getOrDefault('application.environment', 'qa2');
  const port = config.getOrDefault('application.port', '24200');
  const resolvedBaseUrl = (baseUrl && baseUrl.includes('${'))
    ? `https://ui-lb.${env}.reyl.fs.caws.local:${port}${basePath}`
    : baseUrl;

  const targetUrl = resolvedBaseUrl || `https://ui-lb.${env}.reyl.fs.caws.local:${port}${basePath}`;

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
  launchBrowser,
  closeBrowser,
  takeScreenshot,
};
