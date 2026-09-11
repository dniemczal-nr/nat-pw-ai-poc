import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { MainMenuPage } from './MainMenuPage';

/** Live UNIQA leaf id for Group Work → All Alerts. */
export const ALL_ALERTS_LEAF_ID = 'menu-item_group_work_path_menu-item_all_alerts_path';

/**
 * Dropdown filters on UNIQA QA All Alerts (Search Alerts – Generic View).
 * Native `<select>` controls sit under Supplementary Attributes (collapsed by default).
 */
export const ALL_ALERTS_FILTER_DROPDOWNS = [
  {
    label: /organization unit/i,
    selectId: 'EIM_AlertsSearch__ORGUNIT_ID',
  },
  {
    label: /type\/sub-type/i,
    selectId: 'EIM_AlertsSearch__DOMAIN_ID',
  },
  {
    label: /alert source/i,
    selectId: 'EIM_AlertsSearch__SOURCE_SYSTEM',
  },
  {
    label: /active\/inactive/i,
    selectId: 'EIM_AlertsSearch__ACTIVE_FLAG',
  },
  {
    label: /^priority$/i,
    selectId: 'EIM_AlertsSearch__PRIORITY',
  },
  {
    label: /^status$/i,
    selectId: 'EIM_AlertsSearch__STATUS_ID',
  },
] as const;

/**
 * Group Work → All Alerts (Search Alerts) screen.
 * Focus: filter-bar dropdowns (esp. Organization Unit) and results chrome.
 */
export class AllAlertsPage extends BasePage {
  readonly mainMenu: MainMenuPage;

  constructor(page: Page) {
    super(page);
    this.mainMenu = new MainMenuPage(page);
  }

  private get searchForm(): Locator {
    return this.page.locator('#EIM_AlertsSearch');
  }

  private get resultsTable(): Locator {
    return this.page.locator('#EIM_AlertsSearchResults_interactiveListTable');
  }

  private get supplementaryToggle(): Locator {
    return this.page.locator('#EIM__AllAlerts_SupplementaryAttributes');
  }

  private get supplementarySection(): Locator {
    return this.page.locator('#EIM_AlertsSearch__EIM__AllAlerts_SupplementaryAttributes');
  }

  private get organizationUnitSelect(): Locator {
    return this.page.locator('#EIM_AlertsSearch__ORGUNIT_ID');
  }

  filterSelect(selectId: string): Locator {
    return this.page.locator(`[id="${selectId}"]`);
  }

  /** Navigate via main menu leaf (session href). */
  async openFromMenu(): Promise<void> {
    await this.mainMenu.openLeaf(ALL_ALERTS_LEAF_ID, 'All Alerts');
    await this.assertOnAllAlertsPage();
  }

  /** Assert All Alerts / Search Alerts shell is shown (not login). */
  async assertOnAllAlertsPage(): Promise<void> {
    await this.mainMenu.assertNotOnLoginPage();
    await expect(
      this.page.getByText(/search alerts/i).first(),
      'All Alerts page title',
    ).toBeVisible({ timeout: 20000 });
    await expect(this.searchForm, 'alerts search form').toBeVisible({ timeout: 15000 });
  }

  /** Filter region + results grid landmarks. */
  async assertPrimaryRegions(): Promise<void> {
    await this.assertOnAllAlertsPage();
    await expect(this.searchForm, 'filter / search region').toBeVisible();
    await expect(this.resultsTable, 'results grid').toBeAttached({ timeout: 15000 });
  }

  /** Expand Supplementary Attributes so Organization Unit and peer selects are visible. */
  async expandSupplementaryAttributes(): Promise<void> {
    await expect(this.supplementaryToggle, 'Supplementary Attributes toggle').toBeAttached({
      timeout: 10000,
    });
    const className = (await this.supplementaryToggle.getAttribute('class')) || '';
    if (!/\bexpanded\b/.test(className)) {
      await this.supplementaryToggle.click({ force: true });
    }
    await expect(this.supplementarySection, 'Supplementary Attributes section').toBeVisible({
      timeout: 10000,
    });
    await expect(this.organizationUnitSelect, 'Organization Unit select').toBeVisible({
      timeout: 10000,
    });
  }

  /** Assert a filter `<select>` is visible/enabled and labelled. */
  async assertDropdownAvailable(selectId: string, label: RegExp): Promise<void> {
    const select = this.filterSelect(selectId);
    await expect(select, `filter ${selectId}`).toBeVisible({ timeout: 10000 });
    await expect(select, `filter ${selectId} enabled`).toBeEnabled();
    await expect(
      this.page.locator(`label[for="${selectId}"]`),
      `label for ${selectId}`,
    ).toHaveText(label);
    const optionCount = await select.locator('option').count();
    expect(optionCount, `options under ${selectId}`).toBeGreaterThan(0);
  }

  /**
   * Focus/click the native select and assert options exist.
   * Does not require a data-dependent selection.
   */
  async openDropdownAndAssertOptions(selectId: string): Promise<number> {
    const select = this.filterSelect(selectId);
    await select.click({ force: true });
    const count = await select.locator('option').count();
    expect(count, `option list for ${selectId}`).toBeGreaterThan(0);
    await this.page.locator('body').click({ position: { x: 5, y: 5 }, force: true });
    return count;
  }

  /**
   * Select first non-empty Organization Unit option, click Search, assert grid still present.
   * Clears afterward when Clear is available.
   */
  async applyOrganizationUnitFilterSmoke(): Promise<void> {
    await this.expandSupplementaryAttributes();
    const select = this.organizationUnitSelect;
    const values = await select.locator('option').evaluateAll((opts) =>
      opts
        .map((o) => ({
          value: (o as HTMLOptionElement).value,
          text: (o.textContent || '').trim(),
        }))
        .filter((o) => o.value !== ''),
    );
    expect(values.length, 'Organization Unit non-empty options').toBeGreaterThan(0);

    await select.selectOption({ value: values[0].value });
    await this.page.getByRole('button', { name: /^search$/i }).first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.assertOnAllAlertsPage();
    await expect(this.resultsTable, 'results grid after OU filter').toBeAttached({
      timeout: 20000,
    });

    const clear = this.page.getByRole('button', { name: /^clear$/i });
    if ((await clear.count()) > 0 && (await clear.first().isVisible().catch(() => false))) {
      await clear.first().click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.assertOnAllAlertsPage();
    }
  }

  /** Presence-only checks for Search/Clear and grid headers / empty-or-rows. */
  async assertActionsAndGridChrome(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /^search$/i }).first()).toBeVisible();
    const clear = this.page.getByRole('button', { name: /^clear$/i });
    if ((await clear.count()) > 0) {
      await expect(clear.first()).toBeVisible();
    }

    await expect(
      this.page.getByText(/matching alerts/i).first(),
      'Matching Alerts region',
    ).toBeVisible();
    await expect(this.resultsTable).toBeAttached({ timeout: 15000 });
    await expect(this.resultsTable.locator('thead th').first(), 'grid header cell').toBeAttached();

    // DataTables may show zero data rows with an empty-message cell, or seed rows.
    const dataRows = this.resultsTable.locator('tbody tr');
    const emptyCell = this.resultsTable.locator('tbody td.dataTables_empty, tbody .dataTables_empty');
    const emptyText = this.page.getByText(/no records found/i);
    const rowCount = await dataRows.count();
    const hasEmpty =
      (await emptyCell.count()) > 0 ||
      (await emptyText.first().isVisible().catch(() => false));
    expect(
      rowCount >= 0 && (rowCount > 0 || hasEmpty || (await this.resultsTable.locator('tbody').count()) > 0),
      'expected results tbody with rows or empty-state chrome',
    ).toBeTruthy();
  }
}
