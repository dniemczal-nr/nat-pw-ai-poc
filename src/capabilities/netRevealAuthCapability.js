'use strict';

const config = require('../config');
const LoginPage = require('../ui/pages/LoginPage');
const HomePage = require('../ui/pages/HomePage');
const ShellHeaderPage = require('../ui/pages/ShellHeaderPage');

/**
 * Auth flows migrated from NAT LoginHelper + StepDefs (checkLogin).
 */
function resolveEnvPlaceholder(value) {
  if (value == null) return value;
  const raw = String(value);
  const match = raw.match(/^\$\{([A-Za-z0-9_]+)\}$/);
  if (!match) return raw;
  return process.env[match[1]] || '';
}

function resolveCredentials(userType) {
  const key = String(userType || '').toLowerCase();

  if (key === 'admin') {
    const username = config.getOrDefault('userDataAdminUsername', 'admin');
    const password = resolveEnvPlaceholder(config.getOrDefault('userDataAdminPassword', ''))
      || process.env.USERDATA_ADMIN_PASSWORD
      || process.env.AUTH_PASSWORD
      || 'password';
    return { username, password };
  }

  const username = userType;
  const password = resolveEnvPlaceholder(config.getOrDefault('userDataDefaultPassword', ''))
    || process.env.USERDATA_DEFAULT_PASSWORD
    || process.env.AUTH_PASSWORD
    || 'password';
  return { username, password };
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
