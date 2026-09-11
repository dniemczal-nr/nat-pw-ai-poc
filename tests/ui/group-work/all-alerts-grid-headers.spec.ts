/**
 * @plan specs/uniqa-group-work-siblings-and-all-alerts-core.md §C
 * @seed tests/seed.spec.ts
 */
import { test } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('Group Work — All Alerts grid headers', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  test('C.1 required Matching Alerts column headers are present', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    const missingOptional = await allAlerts.assertRequiredGridHeaders();
    for (const missing of missingOptional) {
      test.info().annotations.push({
        type: 'note',
        description: `Optional grid header missing: ${missing}`,
      });
    }
  });

  test('C.2 grid column filter row chrome is present', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    await allAlerts.assertGridFilterRowChrome();
  });
});
