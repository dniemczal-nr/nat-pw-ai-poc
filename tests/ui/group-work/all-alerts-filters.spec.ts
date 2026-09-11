/**
 * @plan specs/uniqa-group-work-all-alerts.md §§1–2
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';
import { ALL_ALERTS_FILTER_DROPDOWNS } from '../../../src/ui/pages/AllAlertsPage';

test.describe('Group Work — All Alerts filters', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  test('1.1 primary regions are visible', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
  });

  test('2.1 Organization Unit dropdown is available', async ({ allAlerts, mainMenu }) => {
    await allAlerts.openFromMenu();
    await allAlerts.expandSupplementaryAttributes();

    await allAlerts.assertDropdownAvailable(
      'EIM_AlertsSearch__ORGUNIT_ID',
      /organization unit/i,
    );
    const optionCount = await allAlerts.openDropdownAndAssertOptions(
      'EIM_AlertsSearch__ORGUNIT_ID',
    );
    expect(optionCount).toBeGreaterThan(1);
    await mainMenu.assertNotOnLoginPage();
  });

  test('2.2 other filter dropdowns are available', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.expandSupplementaryAttributes();

    for (const filter of ALL_ALERTS_FILTER_DROPDOWNS) {
      if (filter.selectId === 'EIM_AlertsSearch__ORGUNIT_ID') continue;
      const select = allAlerts.filterSelect(filter.selectId);
      if ((await select.count()) === 0) {
        test.info().annotations.push({
          type: 'note',
          description: `Optional filter missing: ${filter.selectId}`,
        });
        continue;
      }
      await allAlerts.assertDropdownAvailable(filter.selectId, filter.label);
      await allAlerts.openDropdownAndAssertOptions(filter.selectId);
    }
  });

  test('2.3 Organization Unit participates in filter UX', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.applyOrganizationUnitFilterSmoke();
  });
});
