'use strict';

const BasePage = require('./BasePage');

/**
 * Migrated from NAT HomePage (isHomeSpanAvailable).
 * Selector source: //header//span[contains(text(),'Home')]
 */
class HomePage extends BasePage {
  constructor(page, world) {
    super(page);
    this.world = world;
    this.homeHeaderSelector = "header span:has-text('Home')";
  }

  async isHomeHeaderAvailable(timeout = 15000) {
    if (this.world && this.world.logger) {
      this.world.logger.log('[HomePage] isHomeHeaderAvailable()');
    }
    await this.waitForVisible(this.homeHeaderSelector, timeout);
    return true;
  }
}

module.exports = HomePage;
