import { test, expect } from '../fixtures';
import { resolveBaseUrl } from '../../src/ui/browserManager';

/**
 * From specs/netreveal-admin.md §1 — authenticated shell chrome.
 * Uses storageState (auth.setup); does not re-login.
 */
test.describe('Admin shell header', () => {
  test('shell header and user menu are visible', { tag: '@smoke' }, async ({
    page,
    shellHeader,
    homePage,
  }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });

    const menuVisible = await shellHeader.isUserMenuVisible();
    expect(menuVisible).toBe(true);

    const homeVisible = await homePage.isHomeHeaderAvailable();
    expect(homeVisible).toBe(true);
  });

  test('user menu opens and exposes logout', async ({ page, shellHeader }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await shellHeader.isUserMenuVisible();

    await shellHeader.openUserMenu();
    const logoutVisible = await shellHeader.isLogoutVisible();
    expect(logoutVisible).toBe(true);
  });
});
