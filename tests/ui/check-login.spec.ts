import { test } from '../fixtures';
import { resolveBaseUrl } from '../../src/ui/browserManager';

/**
 * NetReveal login + logout (fresh session — clears storageState).
 * Uses NetRevealAuthCapability + HomePage / LoginPage via capability.
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
