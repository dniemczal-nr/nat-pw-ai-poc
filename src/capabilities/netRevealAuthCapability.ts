import type { Page } from '@playwright/test';
import { LoginPage } from '../ui/pages/LoginPage';
import { HomePage } from '../ui/pages/HomePage';
import { ShellHeaderPage } from '../ui/pages/ShellHeaderPage';

// Shared CJS config.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../config') as {
  get(key: string): string | undefined;
  has(key: string): boolean;
};

function getConfigString(key: string): string {
  if (!config.has(key)) {
    throw new Error(`Missing required config property: ${key}`);
  }
  const value = config.get(key);
  return value == null ? '' : String(value);
}

/** Credentials from properties (default.properties / ENV key overlay). */
function resolveCredentials(userType: string): { username: string; password: string } {
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

export class NetRevealAuthCapability {
  readonly page: Page;
  readonly loginPage: LoginPage;
  readonly homePage: HomePage;
  readonly shellHeaderPage: ShellHeaderPage;

  constructor(page: Page) {
    if (!page) {
      throw new Error('NetRevealAuthCapability requires a Playwright page');
    }
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.homePage = new HomePage(page);
    this.shellHeaderPage = new ShellHeaderPage(page);
  }

  async openEnvironment(): Promise<void> {
    await this.loginPage.open();
    await this.loginPage.assertOnLoginPage();
  }

  /** Migrated from NAT LoginHelper.iLogIntoNetRevealAs */
  async loginAs(userType: string): Promise<void> {
    const { username, password } = resolveCredentials(userType);
    await this.loginPage.login(username, password);
  }

  async assertHomeHeaderAvailable(): Promise<void> {
    await this.homePage.isHomeHeaderAvailable();
  }

  async logout(): Promise<void> {
    await this.shellHeaderPage.logout();
  }

  async assertOnLoginPage(): Promise<void> {
    await this.loginPage.assertOnLoginPage();
  }
}
