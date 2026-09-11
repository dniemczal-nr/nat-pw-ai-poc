import { test, expect } from '../../fixtures';
import type { MainMenuPage } from '../../../src/ui/pages/MainMenuPage';
import { resolveBaseUrl } from '../../../src/ui/browserManager';
import type { MenuLeaf } from './menuInventory';

export { test, expect };

/** Open app shell then navigate to a menu leaf and assert screen loaded. */
export async function openMenuLeaf(
  page: import('@playwright/test').Page,
  mainMenu: MainMenuPage,
  leaf: MenuLeaf,
): Promise<void> {
  await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
  await mainMenu.assertNotOnLoginPage();
  await mainMenu.openLeaf(leaf.leafId, leaf.linkName);
  await mainMenu.assertScreenLoaded();
}

export function defineMenuSmokeSuite(title: string, leaves: MenuLeaf[]): void {
  test.describe(title, () => {
    for (const leaf of leaves) {
      const name = `${leaf.linkName} opens (${leaf.leafId})`;
      if (leaf.skip) {
        test(name, async () => {
          test.skip(true, leaf.skip);
        });
        continue;
      }
      test(name, async ({ page, mainMenu }) => {
        await openMenuLeaf(page, mainMenu, leaf);
      });
    }
  });
}
