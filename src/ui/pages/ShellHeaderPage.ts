import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ShellHeaderPage extends BasePage {
  /** Dropdown container for the user menu. */
  readonly userMenuContainerSelector = '#menu_0';
  /** User menu trigger — NAT MainMenuPage: //li[@id='menu_0.li0'] */
  readonly userMenuButtonSelector = '[id="menu_0.li0"]';
  /** Logout link inside the user menu — NAT: id=cbp_logout */
  readonly logoutLinkSelector = '#cbp_logout';

  constructor(page: Page) {
    super(page);
  }

  async isUserMenuVisible(): Promise<true> {
    await this.waitForVisible(this.userMenuContainerSelector, 10000);
    return true;
  }

  async openUserMenu(): Promise<void> {
    await this.waitForVisible(this.userMenuButtonSelector, 10000);
    await this.click(this.userMenuButtonSelector);
  }

  /** Assert logout action is visible in the open user menu. */
  async isLogoutVisible(): Promise<true> {
    await this.waitForVisible(this.logoutLinkSelector, 10000);
    return true;
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.waitForVisible(this.logoutLinkSelector, 10000);
    await this.click(this.logoutLinkSelector);
  }
}
