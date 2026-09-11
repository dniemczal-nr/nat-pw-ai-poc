import { test as base, expect } from '@playwright/test';
import { NetRevealAuthCapability } from '../src/capabilities/netRevealAuthCapability';
import { AdminAuthCapability } from '../src/capabilities/adminAuthCapability';
import { SshClient } from '../src/capabilities/sshClient';
import { ShellHeaderPage } from '../src/ui/pages/ShellHeaderPage';
import { HomePage } from '../src/ui/pages/HomePage';
import { MainMenuPage } from '../src/ui/pages/MainMenuPage';
import { AllAlertsPage } from '../src/ui/pages/AllAlertsPage';

type NatFixtures = {
  /** NetReveal auth flows (loginAs, logout, home header). Prefer storageState over re-login. */
  netRevealAuth: NetRevealAuthCapability;
  /** Admin login via LoginPage + shell header assert. */
  adminAuth: AdminAuthCapability;
  shellHeader: ShellHeaderPage;
  homePage: HomePage;
  mainMenu: MainMenuPage;
  allAlerts: AllAlertsPage;
  /** Non-UI SSH capability (use from project `ssh` / tests/ssh). */
  ssh: SshClient;
};

/**
 * Seed and generated specs import `test` / `expect` from here — not raw `@playwright/test`.
 */
export const test = base.extend<NatFixtures>({
  netRevealAuth: async ({ page }, use) => {
    await use(new NetRevealAuthCapability(page));
  },
  adminAuth: async ({ page }, use) => {
    await use(new AdminAuthCapability(page));
  },
  shellHeader: async ({ page }, use) => {
    await use(new ShellHeaderPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  mainMenu: async ({ page }, use) => {
    await use(new MainMenuPage(page));
  },
  allAlerts: async ({ page }, use) => {
    await use(new AllAlertsPage(page));
  },
  ssh: async ({}, use) => {
    await use(new SshClient());
  },
});

export { expect };
