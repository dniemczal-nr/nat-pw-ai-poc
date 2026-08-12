import { test } from '../fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveBaseUrl } = require('../../src/ui/browserManager');

/**
 * Migrated from features/ui/check-login.feature (NetReveal login + logout).
 * Uses NetRevealAuthCapability + HomePage / LoginPage via capability.
 * Fresh session (no storageState): verifies full login/logout cycle.
 */
test.describe('NetReveal login and logout', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login and logout as admin', async ({ page, netRevealAuth }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });

    await netRevealAuth.openEnvironment();
    await netRevealAuth.loginAs('admin');
    await netRevealAuth.assertHomeHeaderAvailable();
    await netRevealAuth.logout();
    await netRevealAuth.assertOnLoginPage();
  });
});
