import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * NetReveal main application menu (`#mainMenu`).
 * Leaf screens are opened via session-bound `href` tokens (not hardcoded URLs).
 */
export class MainMenuPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Wait until the main menu tree is present in the authenticated shell. */
  async assertMenuReady(timeout = 20000): Promise<void> {
    await expect(this.page.locator('#mainMenu'), 'main menu container').toBeAttached({
      timeout,
    });
  }

  /** Open the hamburger menu if the navigation tree is not visible. */
  async ensureMenuOpen(): Promise<void> {
    await this.assertMenuReady();
    const myWork = this.page.getByRole('menuitem', { name: 'My Work' });
    if (await myWork.isVisible().catch(() => false)) {
      return;
    }
    await this.page.getByRole('button', { name: 'Menu' }).click();
    await expect(myWork, 'My Work menuitem after opening menu').toBeVisible({ timeout: 10000 });
  }

  /**
   * Open a leaf screen by its stable `li` id
   * (e.g. `menu-item_group_work_path_menu-item_all_alerts_path`).
   * Uses the session `href` when available to avoid hover interceptors.
   */
  async openLeaf(leafId: string, linkName?: string): Promise<void> {
    await this.ensureMenuOpen();

    // Prefer attribute selector — `CSS.escape` is not available in the Node test runner.
    const root = this.page.locator(`[id="${leafId}"]`);
    await expect(root, `menu leaf #${leafId}`).toBeAttached({ timeout: 15000 });

    // Leaves are often exposed as menuitems; anchors may lack an accessible name.
    const anchor = root.locator('a[href]').first();
    if ((await anchor.count()) > 0) {
      const href = await anchor.getAttribute('href');
      if (href && href !== '#' && !href.toLowerCase().startsWith('javascript')) {
        // Resolve against the current page — relative hrefs break when baseURL is origin-only.
        const absolute = new URL(href, this.page.url()).toString();
        await this.page.goto(absolute, { waitUntil: 'domcontentloaded' });
        return;
      }
    }

    if (linkName) {
      const byRole = root.getByRole('menuitem', { name: linkName, exact: true }).first();
      if ((await byRole.count()) > 0) {
        await byRole.click({ force: true });
        await this.page.waitForLoadState('domcontentloaded');
        return;
      }
      await root.getByText(linkName, { exact: true }).first().click({ force: true });
      await this.page.waitForLoadState('domcontentloaded');
      return;
    }

    throw new Error(`No navigable href/menuitem under menu leaf #${leafId}`);
  }

  /** Fail if the login form is shown (session lost). */
  async assertNotOnLoginPage(): Promise<void> {
    await expect(
      this.page.locator('#forms-text-field-username'),
      'expected authenticated screen, not login',
    ).toHaveCount(0);
    await expect(this.page.getByText(/you are not logged in/i)).toHaveCount(0);
  }

  /** Basic chrome: not login, and body has some content. */
  async assertScreenLoaded(): Promise<void> {
    await this.assertNotOnLoginPage();
    await expect(this.page.locator('body')).not.toBeEmpty();
    // Change-password must never appear during menu smoke
    await expect(this.page.getByRole('heading', { name: /change password/i })).toHaveCount(0);
  }
}
