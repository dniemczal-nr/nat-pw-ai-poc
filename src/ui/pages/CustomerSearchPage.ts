import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { MainMenuPage } from './MainMenuPage';

/** Live UNIQA leaf id for Back Office → Subjects → Customers. */
export const CUSTOMERS_LEAF_ID =
  'menu-item_back_office_path_menu-item_subjects_path_menu-item_customers_path';

/**
 * Back Office → Customers (Search Subjects → Search for Customers, screen `EIM_Customer_Search`).
 * Core Attributes need at least one value; a lone `*` is rejected (WRN5506).
 */
export class CustomerSearchPage extends BasePage {
  readonly mainMenu: MainMenuPage;

  constructor(page: Page) {
    super(page);
    this.mainMenu = new MainMenuPage(page);
  }

  private get customerIdInput(): Locator {
    return this.page.locator('#EIM_SearchCustomer__EIM_SearchCustomerSourceRefId');
  }

  private get resultsTable(): Locator {
    return this.page.locator('#EIM_ListCustomersMatching_interactiveListTable');
  }

  async openFromMenu(): Promise<void> {
    await this.mainMenu.openLeaf(CUSTOMERS_LEAF_ID, 'Customers');
    await this.mainMenu.assertNotOnLoginPage();
    await expect(this.customerIdInput, 'Customer ID search field').toBeVisible({ timeout: 20000 });
  }

  /** Search by exact Customer ID and open the single matching customer (name link). */
  async openCustomer(customerId: string): Promise<void> {
    await this.customerIdInput.fill(customerId);
    await this.page.getByRole('button', { name: /^search$/i }).first().click();
    const row = this.resultsTable.locator('tbody tr').filter({ hasText: customerId });
    await expect(row, `one search result for ${customerId}`).toHaveCount(1, { timeout: 20000 });
    await row.locator('td.CUSTOMER_NAME a').click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
