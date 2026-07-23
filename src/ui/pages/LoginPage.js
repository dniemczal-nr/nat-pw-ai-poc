'use strict';

const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page, world) {
    super(page);
    this.world = world;
    this.usernameSelector = '#forms-text-field-username';
    this.passwordSelector = '#forms-text-field-password';
    this.submitSelector = 'button.btn.btn-success.btn-block[type="submit"]';
  }

  async open() {
    if (this.world && this.world.logger) {
      this.world.logger.log('[LoginPage] open() called');
    }
    // assumes baseUrl already opened; override if a specific path is needed
    return this.page; // no-op for now
  }

  async login(username, password) {
    if (this.world && this.world.logger) {
      this.world.logger.log('[LoginPage] login() starting with username:', username);
      this.world.logger.log('[LoginPage] Using selectors:', {
        usernameSelector: this.usernameSelector,
        passwordSelector: this.passwordSelector,
        submitSelector: this.submitSelector,
      });
    }

    await this.fill(this.usernameSelector, username);
    await this.fill(this.passwordSelector, password);
    await this.click(this.submitSelector);

    if (this.world && this.world.logger) {
      this.world.logger.log('[LoginPage] login() completed');
    }
  }

  /**
   * Migrated from NAT LoginPage.getLoginButtonText() assertion.
   */
  async assertOnLoginPage(timeout = 15000) {
    await this.waitForVisible(this.submitSelector, timeout);
    const text = (await this.page.textContent(this.submitSelector) || '').trim();
    if (!text.includes('Login')) {
      throw new Error(`Expected login button text to contain "Login", got: "${text}"`);
    }
    return true;
  }
}

module.exports = LoginPage;
