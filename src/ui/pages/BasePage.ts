import type { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {
    if (!page) {
      throw new Error('BasePage requires a Playwright page instance');
    }
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  async waitForVisible(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }
}
