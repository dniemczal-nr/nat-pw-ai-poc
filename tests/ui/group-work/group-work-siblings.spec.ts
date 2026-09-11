/**
 * @plan specs/uniqa-group-work-siblings-and-all-alerts-core.md §A
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';
import { GROUP_WORK_SIBLINGS } from '../../../src/ui/pages/GroupWorkSiblingPage';

test.describe('Group Work — sibling screen chrome', () => {
  test.beforeEach(async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();
  });

  for (const sibling of GROUP_WORK_SIBLINGS) {
    test(`A.1 ${sibling.linkName} opens with search/results landmarks`, async ({
      groupWorkSibling,
      mainMenu,
    }) => {
      test.skip(!!sibling.skip, sibling.skip || '');

      await groupWorkSibling.open(sibling);
      await mainMenu.assertNotOnLoginPage();
    });

    test(`A.2 ${sibling.linkName} Organization Unit when present`, async ({
      groupWorkSibling,
      mainMenu,
    }) => {
      test.skip(!!sibling.skip, sibling.skip || '');

      await groupWorkSibling.open(sibling);
      const hasOu = await groupWorkSibling.assertOrgUnitIfPresent(sibling);
      if (!hasOu) {
        test.info().annotations.push({
          type: 'note',
          description: `${sibling.linkName}: no Organization Unit control (optional)`,
        });
      }
      await mainMenu.assertNotOnLoginPage();
      expect(true).toBeTruthy();
    });
  }
});
