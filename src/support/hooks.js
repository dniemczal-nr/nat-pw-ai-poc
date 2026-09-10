'use strict';

const { Before, After } = require('@cucumber/cucumber');

/**
 * Cucumber hooks for non-UI scenarios (SSH, etc.).
 * UI browser lifecycle lives in Playwright Test — not here.
 */
Before(function (scenario) {
  const scenarioName = scenario && scenario.pickle && scenario.pickle.name
    ? scenario.pickle.name
    : (scenario && scenario.name) || 'Unnamed scenario';

  const rawTags = (scenario && scenario.pickle && scenario.pickle.tags) || scenario.tags || [];

  const tags = rawTags.map((tag) => {
    if (!tag) return undefined;
    if (typeof tag === 'string') return tag;
    if (typeof tag.name === 'string') return tag.name;
    return undefined;
  }).filter(Boolean);

  this.scenarioName = scenarioName;
  this.tags = tags;

  const { createLogger } = require('./logger');
  this.logger = createLogger(this.scenarioName);

  const upperTags = tags.map((t) => t.toUpperCase());
  this.isApiScenario = upperTags.includes('@API') || upperTags.includes('@REST');

  // eslint-disable-next-line no-console
  console.log('[Before] Scenario:', this.scenarioName, 'Tags:', this.tags);
});

After(async function (scenario) {
  const status = scenario && scenario.result && scenario.result.status;

  if (status && status.toLowerCase && status.toLowerCase() !== 'passed') {
    // eslint-disable-next-line no-console
    console.log('[After] Scenario failed:', this.scenarioName, 'Status:', status);
  }

  if (this.logger && typeof this.logger.close === 'function') {
    this.logger.close();
  }

  this.rest = undefined;
  this.db = undefined;
  this.ssh = undefined;
  this.mq = undefined;
  this.logger = null;
});
