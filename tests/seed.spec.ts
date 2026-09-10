import { test, expect } from './fixtures';
import { resolveBaseUrl } from '../src/ui/browserManager';

/**
 * Seed for Playwright AI Agents (Planner → Generator → Healer).
 *
 * Conventions:
 * - Session comes from `storageState` (auth.setup) — do NOT re-login here.
 * - Use capabilities / POM fixtures — no raw CSS selectors in the spec.
 * - Happy path mirrors admin-login: authenticated shell header is visible.
 */
test.describe('seed — authenticated admin shell', () => {
  test('shell header is visible for logged-in admin', async ({ page, shellHeader }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });

    const visible = await shellHeader.isUserMenuVisible();
    expect(visible).toBe(true);
  });
});
