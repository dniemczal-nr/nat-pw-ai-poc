/**
 * @plan specs/uniqa-matching-columns-my-work-ou-negative.md §E
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('Group Work — All Alerts negative Search', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  test('E.1 negative Alert ID search keeps shell usable', async ({ allAlerts, mainMenu }) => {
    await allAlerts.openFromMenu();
    await allAlerts.searchByAlertId('NO-SUCH-ALERT-999999');
    await mainMenu.assertNotOnLoginPage();
    await allAlerts.clearSearchForm();
    await allAlerts.expandCoreAttributes();
    await expect(allAlerts.filterSelect('EIM_AlertsSearch__EIM_SearchAlertId')).toHaveValue('');
  });

  test('E.2 negative Main Customer Name search keeps shell usable', async ({
    allAlerts,
    mainMenu,
  }) => {
    await allAlerts.openFromMenu();
    await allAlerts.searchByMainCustomerName('NO-SUCH-CUSTOMER-ZZZ');
    await mainMenu.assertNotOnLoginPage();
    await allAlerts.clearSearchForm();
    await allAlerts.expandLinkedTo();
    await expect(
      allAlerts.filterSelect('EIM_AlertsSearch__EIM_SearchAlertsMainCustomerName'),
    ).toHaveValue('');
  });

  test('E.3 negative Case Identifier search keeps shell usable', async ({
    allAlerts,
    mainMenu,
  }) => {
    await allAlerts.openFromMenu();
    await allAlerts.searchByCaseIdentifier('NO-SUCH-CASE-000');
    await mainMenu.assertNotOnLoginPage();
    await allAlerts.clearSearchForm();
    await allAlerts.expandLinkedTo();
    await expect(
      allAlerts.filterSelect('EIM_AlertsSearch__EIM_SearchCaseIdentifier'),
    ).toHaveValue('');
  });
});
