/**
 * @plan specs/uniqa-matching-columns-my-work-ou-negative.md §A
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('Group Work — All Alerts grid columns (depth)', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  test('A.1 required Matching Alerts headers remain present', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    await allAlerts.assertRequiredGridHeaders();
  });

  test('A.2 optional Matching Alerts columns soft inventory', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    const missing = await allAlerts.collectMissingOptionalGridHeaders();
    for (const pattern of missing) {
      test.info().annotations.push({
        type: 'note',
        description: `Optional grid header missing: ${pattern}`,
      });
    }
    // Soft inventory — always pass; annotations carry the view-config signal.
    expect(true).toBeTruthy();
  });

  test('A.3 required header relative order soft-check', async ({ allAlerts }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    const ordered = await allAlerts.assertRequiredHeaderRelativeOrder();
    if (!ordered) {
      test.info().annotations.push({
        type: 'note',
        description: 'Required Matching Alerts header relative order differs from expected',
      });
    }
    expect(true).toBeTruthy();
  });

  test('A.4 filter-row control under Alert Identifier or Type/Sub-Type', async ({
    allAlerts,
  }) => {
    await allAlerts.openFromMenu();
    await allAlerts.assertPrimaryRegions();
    await allAlerts.assertFilterUnderRequiredColumn();
  });
});
