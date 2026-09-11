import { test, expect } from '../fixtures';
import { resolveBaseUrl } from '../../src/ui/browserManager';

/**
 * From specs/netreveal-admin.md §2 — logout from authenticated shell.
 * Starts from storageState; does not perform a fresh login first.
 */
test.describe('Admin logout', () => {
  test('admin can log out successfully', { tag: '@smoke' }, async ({
    page,
    shellHeader,
    netRevealAuth,
  }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });

    const menuVisible = await shellHeader.isUserMenuVisible();
    expect(menuVisible).toBe(true);

    await netRevealAuth.logout();
    await netRevealAuth.assertOnLoginPage();
  });

  test('logged-out user cannot see admin shell chrome', async ({
    page,
    shellHeader,
    netRevealAuth,
  }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await shellHeader.isUserMenuVisible();

    await netRevealAuth.logout();
    await netRevealAuth.assertOnLoginPage();

    // Shell user menu from authenticated session must not remain visible.
    await expect(page.locator(shellHeader.userMenuContainerSelector)).toHaveCount(0);

    // Login gate remains effective if shell URL is revisited.
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await netRevealAuth.assertOnLoginPage();
  });
});
