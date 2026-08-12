import { test, expect } from '../fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../src/config');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveBaseUrl } = require('../../src/ui/browserManager');

/**
 * Migrated from features/ui/admin-login.feature
 * Uses AdminAuthCapability + ShellHeaderPage — no raw selectors in the spec.
 * Fresh session (no storageState): this spec verifies the login flow itself.
 */
test.describe('Admin UI login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('admin can log in successfully', async ({ page, adminAuth, shellHeader }) => {
    const username = config.get('userDataAdminUsername');
    const password = config.get('userDataAdminPassword');

    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await adminAuth.loginAsAdmin(username, password);

    const visible = await shellHeader.isUserMenuVisible();
    expect(visible).toBe(true);
  });
});
