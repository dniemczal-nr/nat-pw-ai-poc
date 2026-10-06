import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** The menu has no such item for the logged-in user (role without access, or a wrong path). */
export class MenuItemNotFoundError extends Error {}

/** Menu HTML is complete once the top level shows; NAT MainMenuPage waits 2 s per level too. */
const MENU_ITEM_TIMEOUT_MS = 2000;
const HOVER_TIMEOUT_MS = 300;
const TRIAL_CLICK_TIMEOUT_MS = 500;

function exactText(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
}

function byId(id: string): string {
  return `li[id="${id.replace(/["\\]/g, '\\$&')}"]`;
}

/** One clickable screen of the main menu, as rendered for the logged-in user. */
export type MenuScreen = {
  /** Labels from the top level down to the link, e.g. ["Group Work", "All Alerts"]. */
  labels: string[];
  /** `labels` joined with `->` — the same form as NAT `I open menu item: "…"`. */
  path: string;
  /** id of the link's li, e.g. menu-item_group_work_path_menu-item_all_alerts_path (stable per menu config). */
  liId: string;
  /** ids of the sub-menu li elements above it, top first. */
  ancestorIds: string[];
  /** Raw href; carries a per-session `secure=` token, so it is never reused — screens are clicked. */
  href: string;
  target: string;
};

/**
 * NetReveal hover menu. Migrated from NAT:
 * - MainMenuPage.goToMainMenuSection — F9 opens the menu
 * - CommonNetRevealPage.navigationMenu — //nav[contains(@id,'mainMenu')]
 * - Utils.callScreen / menuLevelPredicate / revealSubMenu:
 *   //nav//ul[menu-list]/li[menu-item][span=L1]/div[menu-section]/ul[menu-list]/li[menu-item][span=L2]…
 *   leaf: //a[normalize-space()='leaf' or contains(normalize-space(),'leaf')] inside the last section
 *
 * Paths name every level down to the clickable link, e.g. `My Work->My Alerts->My Active Alerts`
 * (`My Alerts` is a sub-menu, not a screen). Paths in use: NAT features `I open menu item: "…"`.
 */
export class MainMenuPage extends BasePage {
  readonly rootList: Locator;
  /** Set once the menu turned out to be covered for native pointer events (same for every page). */
  private pointerBlocked = false;

  constructor(page: Page) {
    super(page);
    // NR 9: section#mainMenuContainer > nav#mainMenu > div.menu-section > ul.menu-list.parent
    this.rootList = page.locator('nav[id*="mainMenu"] ul.menu-list, nav ul.menu-list').first();
  }

  private topLevelItems(): Locator {
    return this.rootList.locator(':scope > li.menu-item');
  }

  /** The current page has the NR main menu (false on login/error pages). */
  async isAvailable(): Promise<boolean> {
    return (await this.topLevelItems().count()) > 0;
  }

  /** Collapse sub-menus revealed by revealLeaf (after a failed step). */
  async collapse(): Promise<void> {
    await this.page.evaluate(() =>
      document.querySelectorAll('nav .menu-item.hover').forEach((el) => el.classList.remove('hover')),
    );
    await this.page.mouse.move(0, 0);
  }

  async ensureMenuOpen(timeout = 10000): Promise<void> {
    const first = this.topLevelItems().first();
    if (await first.isVisible()) return;
    await this.page.keyboard.press('F9');
    await first.waitFor({ state: 'visible', timeout });
  }

  /**
   * Every screen link in the main menu of the logged-in user. NR renders the whole tree into
   * section#mainMenuContainer > nav#mainMenu right after login (no hovering needed):
   *   li.menu-item.sub-menu[id] > span(label) + div.menu-section > ul.menu-list > li.menu-item…
   *   li.menu-item[id] > a[href](label)
   */
  async discoverScreens(): Promise<MenuScreen[]> {
    await this.rootList.waitFor({ state: 'attached', timeout: 10000 });
    return this.rootList.evaluate((top) => {
      const out: {
        labels: string[];
        path: string;
        liId: string;
        ancestorIds: string[];
        href: string;
        target: string;
      }[] = [];
      const text = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
      const walk = (ul: Element, labels: string[], ancestors: string[]) => {
        Array.from(ul.children).forEach((li) => {
          if (!li.classList.contains('menu-item')) return;
          const label = li.querySelector(':scope > span:not(.ellipsis)');
          const sub = li.querySelector(':scope > div.menu-section > ul.menu-list');
          if (sub && label) {
            walk(sub, [...labels, text(label)], [...ancestors, li.id]);
            return;
          }
          const link = li.querySelector(':scope > a');
          if (!link) return;
          const path = [...labels, text(link)];
          out.push({
            labels: path,
            path: path.join('->'),
            liId: li.id,
            ancestorIds: ancestors,
            href: link.getAttribute('href') || '',
            target: link.getAttribute('target') || '',
          });
        });
      };
      walk(top, [], []);
      return out;
    });
  }

  /** CSS hover state + synthetic events (NAT revealSubMenu), then a short real hover. */
  private async revealItem(item: Locator): Promise<void> {
    await item.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      el.classList.add('hover');
      ['pointerover', 'mouseover', 'mouseenter', 'mousemove'].forEach((type) =>
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })),
      );
    });
    // Short: NAT waits 200 ms per level; a covered item must not cost seconds per menu level.
    if (!this.pointerBlocked) await item.hover({ timeout: HOVER_TIMEOUT_MS }).catch(() => undefined);
  }

  /** Reveal a discovered screen through its sub-menus (by li id) and return its link. */
  async revealScreen(screen: MenuScreen, timeout = 10000): Promise<Locator> {
    if (!screen.liId) return this.revealLeaf(screen.path, timeout);
    await this.ensureMenuOpen(timeout);
    for (const id of screen.ancestorIds) {
      const item = this.page.locator(byId(id));
      await item.waitFor({ state: 'attached', timeout: MENU_ITEM_TIMEOUT_MS }).catch(() => {
        throw new MenuItemNotFoundError(`Menu item #${id} not found (path "${screen.path}")`);
      });
      await this.revealItem(item);
    }
    const leaf = this.page.locator(`${byId(screen.liId)} > a`);
    await leaf.waitFor({ state: 'attached', timeout: MENU_ITEM_TIMEOUT_MS }).catch(() => {
      throw new MenuItemNotFoundError(`Menu link #${screen.liId} not found (path "${screen.path}")`);
    });
    await leaf.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    return leaf;
  }

  /**
   * Reveal every sub-menu of `A->B->C` and return the leaf link, ready to click.
   * Kept separate from the click so screen timings start at the user's click,
   * not at the hover mechanics.
   */
  async revealLeaf(menuPath: string, timeout = 10000): Promise<Locator> {
    const parts = menuPath.split('->').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) {
      throw new Error(`Menu path needs at least two levels (got "${menuPath}")`);
    }

    await this.ensureMenuOpen(timeout);

    let scope = this.rootList;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const items =
        i === 0
          ? scope.locator(':scope > li.menu-item')
          : scope.locator(':scope > div.menu-section > ul.menu-list > li.menu-item');
      const item = items.filter({ has: this.page.locator(':scope > span', { hasText: exactText(parts[i]) }) });
      await item.waitFor({ state: 'attached', timeout: MENU_ITEM_TIMEOUT_MS }).catch(() => {
        throw new MenuItemNotFoundError(`Menu item "${parts[i]}" not found (path "${menuPath}")`);
      });
      await this.revealItem(item);
      scope = item;
    }

    const leafLabel = parts[parts.length - 1];
    const links = scope.locator('a');
    const leaf = links
      .filter({ hasText: exactText(leafLabel) })
      .or(links.filter({ hasText: leafLabel }))
      .first();
    await leaf.waitFor({ state: 'attached', timeout: MENU_ITEM_TIMEOUT_MS }).catch(async () => {
      const isSubMenu = await scope
        .locator(':scope > div.menu-section > ul.menu-list > li.menu-item > span')
        .filter({ hasText: exactText(leafLabel) })
        .count();
      if (isSubMenu) {
        throw new Error(`"${leafLabel}" is a sub-menu, not a screen — add its next level (path "${menuPath}")`);
      }
      throw new MenuItemNotFoundError(`Menu link "${leafLabel}" not found (path "${menuPath}")`);
    });
    await leaf.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    return leaf;
  }

  /**
   * Decide — before timing starts — how the leaf will be clicked, and return that click.
   * A trial click checks actionability without clicking: when the menu animation or an overlay
   * covers the link, a native click would wait out its timeout, so use a DOM click instead
   * (NAT callScreen does the same fallback). The returned click is the only part that is timed.
   */
  async prepareLeafClick(leaf: Locator): Promise<() => Promise<void>> {
    const domClick = () => leaf.evaluate((el) => (el as HTMLElement).click());
    if (this.pointerBlocked) return domClick;
    const nativeWorks = await leaf.click({ trial: true, timeout: TRIAL_CLICK_TIMEOUT_MS }).then(
      () => true,
      () => false,
    );
    if (!nativeWorks) {
      this.pointerBlocked = true;
      return domClick;
    }
    return async () => {
      try {
        await leaf.click({ timeout: TRIAL_CLICK_TIMEOUT_MS });
      } catch {
        await domClick();
      }
    };
  }
}
