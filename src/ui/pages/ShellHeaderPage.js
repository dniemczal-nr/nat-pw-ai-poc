'use strict';

const BasePage = require('./BasePage');

class ShellHeaderPage extends BasePage {
  constructor(page) {
    super(page);
    // Dropdown container for the user menu
    this.userMenuContainerSelector = '#menu_0';
    // Logout link inside the user menu
    this.logoutLinkSelector = '#cbp_logout';
  }

  async isUserMenuVisible() {
    // Assert that the user menu container is present/visible, indicating
    // that the user is logged in and the toolbar dropdown is available.
    await this.waitForVisible(this.userMenuContainerSelector, 10000);
    return true;
  }

  async logout() {
    // Ensure the menu is present
    await this.waitForVisible(this.userMenuContainerSelector, 10000);
    // Click the logout link; Playwright will follow the href
    await this.click(this.logoutLinkSelector);
  }
}

module.exports = ShellHeaderPage;
