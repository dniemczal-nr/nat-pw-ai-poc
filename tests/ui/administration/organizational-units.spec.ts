/**
 * @plan specs/uniqa-matching-columns-my-work-ou-negative.md §C
 * @seed tests/seed.spec.ts
 */
import { test } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('Administration — Organizational Units (read-only)', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  test('C.1 Organizational Units list opens', async ({ organizationalUnits, mainMenu }) => {
    await organizationalUnits.openFromMenu();
    await mainMenu.assertNotOnLoginPage();
  });

  test('C.2 list has identity columns / rows chrome', async ({ organizationalUnits }) => {
    await organizationalUnits.openFromMenu();
    await organizationalUnits.assertListChrome();
  });
});
