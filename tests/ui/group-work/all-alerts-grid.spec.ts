/**
 * @plan specs/uniqa-group-work-all-alerts.md §3
 * @seed tests/seed.spec.ts
 */
import { test } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('Group Work — All Alerts grid chrome', () => {
  test('3.1 actions and grid chrome are present', async ({ page, mainMenu, allAlerts }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();

    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    await allAlerts.assertActionsAndGridChrome();
  });
});
