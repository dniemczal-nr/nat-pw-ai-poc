import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Alert details (AML / WLM / CDD). Selectors migrated from NAT AlertDetailsManualPage:
 * - locators.properties XPATH_KEY_ACTION_BUTTON:
 *   //a[@class='menuClickPoint' and @title='Key Actions']/img
 *   | (//div[contains(@id,'KeyAction')]//div[contains(@class,'collapsibleButtons')])[1]
 * - alertStatus: //a[contains(@id,'KeyAction')]
 * - backButton: id=back
 */
export class AlertDetailsPage extends BasePage {
  /** Key Actions control — rendered once the alert details are usable. */
  readonly keyActions: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.keyActions = page
      .locator(
        [
          'a.menuClickPoint[title="Key Actions"]',
          'div[id*="KeyAction"] div.collapsibleButtons',
          'a[id*="KeyAction"]',
        ].join(', '),
      )
      .filter({ visible: true })
      .first();
    this.backButton = page.locator('#back');
  }

  /** Leaving through Back releases the alert lock taken when the details were opened. */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }
}
