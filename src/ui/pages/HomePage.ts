import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Migrated from NAT HomePage (isHomeSpanAvailable).
 * Selector source: //header//span[contains(text(),'Home')]
 */
export class HomePage extends BasePage {
  readonly homeHeaderSelector = "header span:has-text('Home')";

  constructor(page: Page) {
    super(page);
  }

  async isHomeHeaderAvailable(timeout = 15000): Promise<true> {
    await this.waitForVisible(this.homeHeaderSelector, timeout);
    return true;
  }
}
