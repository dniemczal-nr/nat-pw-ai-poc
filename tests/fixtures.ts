import { test as base, expect } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NetRevealAuthCapability = require('../src/capabilities/netRevealAuthCapability');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminAuthCapability = require('../src/capabilities/adminAuthCapability');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ShellHeaderPage = require('../src/ui/pages/ShellHeaderPage');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomePage = require('../src/ui/pages/HomePage');

type NatFixtures = {
  /** NetReveal auth flows (loginAs, logout, home header). Prefer storageState over re-login. */
  netRevealAuth: InstanceType<typeof NetRevealAuthCapability>;
  /** Admin login via LoginPage + shell header assert. */
  adminAuth: InstanceType<typeof AdminAuthCapability>;
  shellHeader: InstanceType<typeof ShellHeaderPage>;
  homePage: InstanceType<typeof HomePage>;
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
});

export { expect };
