'use strict';

const config = require('../config');
const LoginPage = require('../ui/pages/LoginPage');
const HomePage = require('../ui/pages/HomePage');
const ShellHeaderPage = require('../ui/pages/ShellHeaderPage');

/**
 * Read a config string as-is (including intentionally empty values).
 * Does not fall back through ENV or hardcoded defaults via ||.
 */
function getConfigString(key) {
  if (!config.has(key)) {
    throw new Error(`Missing required config property: ${key}`);
  }
  const value = config.get(key);
  return value == null ? '' : String(value);
}

/**
 * Auth flows migrated from NAT LoginHelper + StepDefs (checkLogin).
 * Credentials come from properties (default.properties / ENV key overlay).
 */
function resolveCredentials(userType) {
  const key = String(userType || '').toLowerCase();

  if (key === 'admin') {
    return {
      username: getConfigString('userDataAdminUsername'),
      password: getConfigString('userDataAdminPassword'),
    };
  }

  return {
    username: userType,
    password: getConfigString('userDataDefaultPassword'),
  };
}

class NetRevealAuthCapability {
  constructor(page, world) {
    if (!page) {
      throw new Error('NetRevealAuthCapability requires a Playwright page');
    }
    this.page = page;
    this.world = world;
    this.loginPage = new LoginPage(page, world);
    this.homePage = new HomePage(page, world);
    this.shellHeaderPage = new ShellHeaderPage(page);
  }

  async openEnvironment() {
    if (this.world && this.world.logger) {
      this.world.logger.log('[NetRevealAuthCapability] openEnvironment()');
    }
    await this.loginPage.open();
    await this.loginPage.assertOnLoginPage();
  }

  /**
   * Migrated from NAT LoginHelper.iLogIntoNetRevealAs
   */
  async loginAs(userType) {
    const { username, password } = resolveCredentials(userType);
    if (this.world && this.world.logger) {
      this.world.logger.log('[NetRevealAuthCapability] loginAs()', { userType, username });
    }
    await this.loginPage.login(username, password);
  }

  async assertHomeHeaderAvailable() {
    await this.homePage.isHomeHeaderAvailable();
  }

  async logout() {
    if (this.world && this.world.logger) {
      this.world.logger.log('[NetRevealAuthCapability] logout()');
    }
    await this.shellHeaderPage.logout();
  }

  async assertOnLoginPage() {
    await this.loginPage.assertOnLoginPage();
  }
}

module.exports = NetRevealAuthCapability;
