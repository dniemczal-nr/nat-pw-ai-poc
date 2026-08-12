'use strict';

const { Before, After } = require('@cucumber/cucumber');
const { launchBrowser, closeBrowser, takeScreenshot } = require('../ui/browserManager');

/**
 * Generic Before hook.
 *
 * Populates basic scenario metadata on the World instance and derives
 * simple flags from tags. Keeps logic intentionally thin so capabilities
 * can be plugged in later phases.
 */
Before(function (scenario) {
  const scenarioName = scenario && scenario.pickle && scenario.pickle.name
    ? scenario.pickle.name
    : (scenario && scenario.name) || 'Unnamed scenario';

  const rawTags = (scenario && scenario.pickle && scenario.pickle.tags) || scenario.tags || [];

  // Normalise tags to array of string names (e.g. ['@UI', '@api'])
  const tags = rawTags.map((tag) => {
    if (!tag) return undefined;
    if (typeof tag === 'string') return tag;
    if (typeof tag.name === 'string') return tag.name;
    return undefined;
  }).filter(Boolean);

  this.scenarioName = scenarioName;
  this.tags = tags;

  // Initialise per-scenario logger (tee to console and file)
  const { createLogger } = require('./logger');
  this.logger = createLogger(this.scenarioName);

  // Derived booleans from tags
  const upperTags = tags.map((t) => t.toUpperCase());
  this.isUiScenario = upperTags.includes('@UI') || upperTags.includes('@UI');

  // Hybrid: Cucumber @ui still launches via browserManager.
  // Playwright Test path owns its own browser lifecycle (fixtures + storageState).
  // Prefer migrating UI to tests/*.spec.ts; tag leftover features @legacy-ui when ready.
  if (this.isUiScenario) {
    return (async () => {
      const { browser, context, page } = await launchBrowser();
      this.ui = { browser, context, page };
    })();
  }
  this.isApiScenario = upperTags.includes('@API') || upperTags.includes('@REST');

  // Basic logging for debugging purposes only
  // eslint-disable-next-line no-console
  console.log('[Before] Scenario:', this.scenarioName, 'Tags:', this.tags);
});

/**
 * Generic After hook.
 *
 * Performs lightweight cleanup and records placeholder attachments for
 * failed UI scenarios. No real capability logic is implemented here.
 */
After(async function (scenario) {
  const status = scenario && scenario.result && scenario.result.status;

  if (status && status.toLowerCase && status.toLowerCase() !== 'passed') {
    // eslint-disable-next-line no-console
    console.log('[After] Scenario failed:', this.scenarioName, 'Status:', status);

    if (Array.isArray(this.tags)) {
      const upperTags = this.tags.map((t) => t.toUpperCase());
      if (upperTags.includes('@UI') && this.ui && this.ui.page) {
        try {
          const path = await takeScreenshot(this.ui.page, this, 'failure');
          if (path) {
            this.attachments.push({
              type: 'screenshot',
              path,
              reason: 'Scenario failed and is tagged with @UI',
            });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[After] Failed to capture UI screenshot:', err && err.message);
        }
      }
    }
  }

  // Lightweight cleanup of capability placeholders
    if (this.ui && this.ui.browser) {
    try {
      await closeBrowser(this.ui.browser);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[After] Failed to close UI browser:', err && err.message);
    }
  }

  // Close per-scenario logger if present
  if (this.logger && typeof this.logger.close === 'function') {
    this.logger.close();
  }

  this.ui = undefined;
  this.rest = undefined;
  this.db = undefined;
  this.ssh = undefined;
  this.mq = undefined;
  this.logger = null;
}
);
