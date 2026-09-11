/**
 * @plan specs/uniqa-matching-columns-my-work-ou-negative.md §B
 * @seed tests/seed.spec.ts
 *
 * Runs early-ish under ui/my-work (before long menu packs where possible).
 * Re-establishes session if storageState went stale mid-suite (idle / single-session).
 */
import { test } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';
import {
  MY_WORK_LANDMARK_SCREENS,
  MY_WORK_WORKLISTS,
} from '../../../src/ui/pages/MyWorkListPage';

test.describe('My Work — analyst worklists', () => {
  test.beforeEach(async ({ page, mainMenu, netRevealAuth }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    const loginField = page.locator('#forms-text-field-username');
    if ((await loginField.count()) > 0) {
      await netRevealAuth.loginAs('admin');
    }
    await mainMenu.assertNotOnLoginPage();
  });

  for (const worklist of MY_WORK_WORKLISTS) {
    test(`B.1 ${worklist.linkName} shows list/grid chrome`, async ({
      myWorkList,
      mainMenu,
    }) => {
      await myWorkList.open(worklist);
      await mainMenu.assertNotOnLoginPage();
    });
  }

  for (const screen of MY_WORK_LANDMARK_SCREENS) {
    test(`B.2 ${screen.linkName} landmark chrome`, async ({ myWorkList, mainMenu }) => {
      await myWorkList.open(screen);
      await mainMenu.assertNotOnLoginPage();
    });
  }
});
