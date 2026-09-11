/**
 * @plan specs/uniqa-group-work-siblings-and-all-alerts-core.md §B
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('Group Work — All Alerts core fields', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  test('B.1 Core Attributes fields are present', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertCoreFields();
  });

  test('B.2 negative Alert ID search keeps shell usable', async ({ allAlerts, mainMenu }) => {
    await allAlerts.openFromMenu();
    await allAlerts.searchByAlertId('NO-SUCH-ALERT-999999');
    await mainMenu.assertNotOnLoginPage();
    await allAlerts.clearSearchForm();
    await allAlerts.expandCoreAttributes();
    await expect(allAlerts.filterSelect('EIM_AlertsSearch__EIM_SearchAlertId')).toHaveValue('');
  });

  test('B.3 fill-and-clear Main Customer Name', async ({ allAlerts, mainMenu }) => {
    await allAlerts.openFromMenu();
    await allAlerts.fillAndClearMainCustomerName('SMOKE');
    await mainMenu.assertNotOnLoginPage();
  });
});
