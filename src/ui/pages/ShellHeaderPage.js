'use strict';

const BasePage = require('./BasePage');

class ShellHeaderPage extends BasePage {
  constructor(page) {
    super(page);
    // Dropdown container for the user menu (legacy PoC selector)
    this.userMenuContainerSelector = '#menu_0';
    // User menu trigger — NAT MainMenuPage: //li[@id='menu_0.li0']
    this.userMenuButtonSelector = '[id="menu_0.li0"]';
    // Logout link inside the user menu — NAT: id=cbp_logout
    this.logoutLinkSelector = '#cbp_logout';
  }

  async isUserMenuVisible() {
    // Assert that the user menu container is present/visible, indicating
    // that the user is logged in and the toolbar dropdown is available.
    await this.waitForVisible(this.userMenuContainerSelector, 10000);
    return true;
  }

  async logout() {
    // NAT MainMenuPage.clickOnLogout: open user menu, then click logout
    await this.waitForVisible(this.userMenuButtonSelector, 10000);
    await this.click(this.userMenuButtonSelector);
    await this.waitForVisible(this.logoutLinkSelector, 10000);
    await this.click(this.logoutLinkSelector);
  }
}

module.exports = ShellHeaderPage;
