import type { Page } from '@playwright/test';
import { LoginPage } from '../ui/pages/LoginPage';
import { ShellHeaderPage } from '../ui/pages/ShellHeaderPage';

export class AdminAuthCapability {
  readonly page: Page;
  readonly loginPage: LoginPage;
  readonly shellHeaderPage: ShellHeaderPage;

  constructor(page: Page) {
    if (!page) {
      throw new Error('AdminAuthCapability requires a Playwright page');
    }
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.shellHeaderPage = new ShellHeaderPage(page);
  }

  async loginAsAdmin(username: string, password: string): Promise<void> {
    await this.loginPage.open();
    await this.loginPage.login(username, password);
    await this.shellHeaderPage.isUserMenuVisible();
  }
}
