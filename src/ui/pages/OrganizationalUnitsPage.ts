import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { MainMenuPage } from './MainMenuPage';

/** Live UNIQA leaf id for Administration → Organizational Units. */
export const ORGANIZATIONAL_UNITS_LEAF_ID =
  'home_administration_home_administration_authorisation_base_orgunitlist_caption';

/**
 * Administration → Organizational Units (read-only).
 * Do not click Create / Save / Delete.
 */
export class OrganizationalUnitsPage extends BasePage {
  readonly mainMenu: MainMenuPage;

  constructor(page: Page) {
    super(page);
    this.mainMenu = new MainMenuPage(page);
  }

  private get listTable(): Locator {
    return this.page.locator('#base_OrgUnitList_listTable');
  }

  async openFromMenu(): Promise<void> {
    await this.mainMenu.openLeaf(ORGANIZATIONAL_UNITS_LEAF_ID, 'Organizational Units');
    await this.assertOnOrganizationalUnitsPage();
  }

  async assertOnOrganizationalUnitsPage(): Promise<void> {
    await this.mainMenu.assertNotOnLoginPage();
    await expect(
      this.page.getByText(/organizational units/i).first(),
      'Organizational Units title',
    ).toBeVisible({ timeout: 20000 });
  }

  /** List/grid chrome + identity headers (Code / Name). */
  async assertListChrome(): Promise<void> {
    await this.assertOnOrganizationalUnitsPage();
    await expect(this.listTable, 'OU list table').toBeAttached({ timeout: 15000 });
    const headers = await this.listTable.locator('thead th').allTextContents();
    const normalized = headers.map((h) => h.replace(/\s+/g, ' ').trim());
    const joined = normalized.join(' | ');
    expect(joined, 'OU list has Code header').toMatch(/code/i);
    expect(joined, 'OU list has Name header').toMatch(/name/i);

    const dataRows = this.listTable.locator('tbody tr');
    const emptyText = this.page.getByText(/no records found|no rows found/i);
    const rowCount = await dataRows.count();
    const hasEmpty = await emptyText.first().isVisible().catch(() => false);
    expect(
      rowCount > 0 || hasEmpty,
      'OU list has data rows or empty-state chrome',
    ).toBeTruthy();
  }

  /**
   * Collect OU codes (and names) from the list for overlap checks.
   * Caps at `limit` unique codes.
   */
  async collectOuCodes(limit = 20): Promise<{ codes: string[]; names: string[] }> {
    await expect(this.listTable).toBeAttached({ timeout: 15000 });
    const scraped = await this.listTable.locator('tbody tr').evaluateAll((rows) => {
      const codes: string[] = [];
      const names: string[] = [];
      for (const row of rows) {
        const cells = [...row.querySelectorAll('td')].map((td) =>
          (td.textContent || '').replace(/\s+/g, ' ').trim(),
        );
        // Skip action-only / script-noise cells; Code and Name are typically first two data cells.
        const meaningful = cells.filter(
          (c) =>
            c.length > 0 &&
            !/^base_/i.test(c) &&
            !c.includes('{ let') &&
            !/deleted\.caption/i.test(c),
        );
        if (meaningful.length === 0) continue;
        // Prefer short token as code (UQ_AUT, SHA, TOP) when present.
        const codeLike = meaningful.find((c) => /^[A-Z0-9_]{2,16}$/i.test(c));
        if (codeLike) {
          codes.push(codeLike);
        }
        const nameLike = meaningful.find((c) => c !== codeLike && c.length > 1);
        if (nameLike) {
          names.push(nameLike);
        }
      }
      return { codes, names };
    });

    const uniqueCodes = [...new Set(scraped.codes)].slice(0, limit);
    const uniqueNames = [...new Set(scraped.names)].slice(0, limit);
    return { codes: uniqueCodes, names: uniqueNames };
  }
}
