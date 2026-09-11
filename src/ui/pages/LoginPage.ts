import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly usernameSelector = '#forms-text-field-username';
  readonly passwordSelector = '#forms-text-field-password';
  readonly submitSelector = 'button.btn.btn-success.btn-block[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  /** Assumes the login URL is already opened (baseURL / resolveBaseUrl). */
  async open(): Promise<Page> {
    return this.page;
  }

  async login(username: string, password: string): Promise<void> {
    await this.fill(this.usernameSelector, username);
    await this.fill(this.passwordSelector, password);
    await this.click(this.submitSelector);
  }

  /** Migrated from NAT LoginPage.getLoginButtonText() assertion. */
  async assertOnLoginPage(timeout = 15000): Promise<true> {
    await this.waitForVisible(this.submitSelector, timeout);
    const text = (await this.page.textContent(this.submitSelector) || '').trim();
    if (!text.includes('Login')) {
      throw new Error(`Expected login button text to contain "Login", got: "${text}"`);
    }
    return true;
  }
}
