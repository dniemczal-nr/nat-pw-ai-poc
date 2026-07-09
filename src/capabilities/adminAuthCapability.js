'use strict';

const LoginPage = require('../ui/pages/LoginPage');
const ShellHeaderPage = require('../ui/pages/ShellHeaderPage');

class AdminAuthCapability {
  constructor(page, world) {
    if (!page) {
      throw new Error('AdminAuthCapability requires a Playwright page');
    }
    this.page = page;
    this.world = world;
    this.loginPage = new LoginPage(page, world);
    this.shellHeaderPage = new ShellHeaderPage(page);
  }

  async loginAsAdmin(username, password) {
    if (this.world && this.world.logger) {
      this.world.logger.log('[AdminAuthCapability] loginAsAdmin() called with:', { username });
    }

    await this.loginPage.open();
    await this.loginPage.login(username, password);
    await this.shellHeaderPage.isUserMenuVisible();

    if (this.world && this.world.logger) {
      this.world.logger.log('[AdminAuthCapability] loginAsAdmin() completed');
    }
  }
}

module.exports = AdminAuthCapability;
