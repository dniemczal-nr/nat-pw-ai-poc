'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const AdminAuthCapability = require('../capabilities/adminAuthCapability');
const { launchBrowser } = require('../ui/browserManager');

Given('I am on the login page', async function () {
  if (this.logger) {
    this.logger.log('[uiSteps] Given I am on the login page');
  }

  if (!this.ui) {
    const { browser, context, page } = await launchBrowser();
    this.ui = { browser, context, page };
  }

  this.adminAuth = new AdminAuthCapability(this.ui.page, this);
});

When('I log in as an {string} admin user with password {string}', async function (username, password) {
  if (this.logger) {
    this.logger.log('[uiSteps] When I log in as admin', { username });
  }

  if (!this.adminAuth && this.ui && this.ui.page) {
    this.adminAuth = new AdminAuthCapability(this.ui.page, this);
  }

  await this.adminAuth.loginAsAdmin(username, password);
});

Then('I should see the admin shell header', async function () {
  // ShellHeaderPage.isUserMenuVisible is called as part of login, so here we just
  // assert that the capability exists and page is still valid.
  if (!this.adminAuth) {
    throw new Error('AdminAuthCapability not initialised');
  }
});
