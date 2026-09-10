import { test, expect } from '../fixtures';
import { resolveBaseUrl } from '../../src/ui/browserManager';

// Shared CJS config.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../src/config') as {
  get(key: string): string;
};

/**
 * Login flow verification (fresh session — clears storageState).
 * Uses AdminAuthCapability + ShellHeaderPage — no raw selectors in the spec.
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
