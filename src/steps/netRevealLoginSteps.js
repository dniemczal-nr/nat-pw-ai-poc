'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const NetRevealAuthCapability = require('../capabilities/netRevealAuthCapability');
const { launchBrowser } = require('../ui/browserManager');

async function ensureAuthCapability(world) {
  if (!world.ui) {
    const { browser, context, page } = await launchBrowser();
    world.ui = { browser, context, page };
  }
  if (!world.netRevealAuth) {
    world.netRevealAuth = new NetRevealAuthCapability(world.ui.page, world);
  }
  return world.netRevealAuth;
}

// Migrated from NAT StepDefs — phrases kept 1:1 where possible

Given('I open NetReveal Environment', async function () {
  if (this.logger) {
    this.logger.log('[netRevealLoginSteps] Given I open NetReveal Environment');
  }
  const auth = await ensureAuthCapability(this);
  await auth.openEnvironment();
});

When('I log into NetReveal as {string}', async function (userType) {
  if (this.logger) {
    this.logger.log('[netRevealLoginSteps] When I log into NetReveal as', { userType });
  }
  const auth = await ensureAuthCapability(this);
  await auth.loginAs(userType);
});

Then('I assert that Home header is available', async function () {
  if (this.logger) {
    this.logger.log('[netRevealLoginSteps] Then I assert that Home header is available');
  }
  const auth = await ensureAuthCapability(this);
  await auth.assertHomeHeaderAvailable();
});

When('I am logging out', async function () {
  if (this.logger) {
    this.logger.log('[netRevealLoginSteps] When I am logging out');
  }
  const auth = await ensureAuthCapability(this);
  await auth.logout();
});

Then('I am on the NetReveal LoginPage', async function () {
  if (this.logger) {
    this.logger.log('[netRevealLoginSteps] Then I am on the NetReveal LoginPage');
  }
  const auth = await ensureAuthCapability(this);
  await auth.assertOnLoginPage();
});

// Exact NAT phrase from 01_checkLogin.feature
Then('I assert that I am on the NetReveal LoginPage', async function () {
  if (this.logger) {
    this.logger.log('[netRevealLoginSteps] Then I assert that I am on the NetReveal LoginPage');
  }
  const auth = await ensureAuthCapability(this);
  await auth.assertOnLoginPage();
});
