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

/** Core Attributes text/date inputs on All Alerts (UNIQA QA). */
export const ALL_ALERTS_CORE_FIELDS = [
  { label: /alert id/i, inputId: 'EIM_AlertsSearch__EIM_SearchAlertId' },
  { label: /assigned to/i, inputId: 'EIM_AlertsSearch__EIM_AssignedToSep' },
  { label: /assigned by/i, inputId: 'EIM_AlertsSearch__EIM_AssignedBy_1' },
  {
    label: /from/i,
    inputId: 'EIM_AlertsSearch__EIM_SearchAlertCreatedBetween__FROM',
  },
  {
    label: /to/i,
    inputId: 'EIM_AlertsSearch__EIM_SearchAlertCreatedBetween__TO',
  },
  {
    label: /from/i,
    inputId: 'EIM_AlertsSearch__EIM_SearchAlertLastUpdated__FROM',
  },
  {
    label: /to/i,
    inputId: 'EIM_AlertsSearch__EIM_SearchAlertLastUpdated__TO',
  },
  // Product id typo: SearchCaseNane
  { label: /case name/i, inputId: 'EIM_AlertsSearch__EIM_SearchCaseNane' },
  { label: /case identifier/i, inputId: 'EIM_AlertsSearch__EIM_SearchCaseIdentifier' },
  {
    label: /main customer name/i,
    inputId: 'EIM_AlertsSearch__EIM_SearchAlertsMainCustomerName',
  },
  { label: /main customer id/i, inputId: 'EIM_AlertsSearch__EIM_SearchCustomerId' },
  {
    label: /main employee name/i,
    inputId: 'EIM_AlertsSearch__EIM_SearchEmployeeName',
  },
  { label: /main employee id/i, inputId: 'EIM_AlertsSearch__EIM_SearchEmployeeID' },
] as const;

/** Required Matching Alerts column headers (plan §C.1). */
export const ALL_ALERTS_REQUIRED_GRID_HEADERS = [
  /alert identifier|alert id/i,
  /type\/?sub-?type/i,
  /^priority$/i,
  /^status$/i,
  /organization unit/i,
  /assigned to/i,
] as const;

/** Optional Matching Alerts headers — soft-check only. */
export const ALL_ALERTS_OPTIONAL_GRID_HEADERS = [
  /^description$/i,
  /age in days/i,
  /main customer/i,
  /customer segment/i,
  /customer previously reported/i,
  /case name/i,
  /main employee name/i,
  /^score$/i,
  /related cases/i,
  /other details/i,
  /due date/i,
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

  private get coreToggle(): Locator {
    return this.page.locator('#EIM__AllAlerts_CoreAttributes');
  }

  private get coreSection(): Locator {
    return this.page.locator('#EIM_AlertsSearch__EIM__AllAlerts_CoreAttributes');
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

  private get alertIdInput(): Locator {
    return this.page.locator('#EIM_AlertsSearch__EIM_SearchAlertId');
  }

  private get mainCustomerNameInput(): Locator {
    return this.page.locator('#EIM_AlertsSearch__EIM_SearchAlertsMainCustomerName');
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

  /** Expand Core Attributes when the section is collapsed. */
  async expandCoreAttributes(): Promise<void> {
    await expect(this.coreToggle, 'Core Attributes toggle').toBeAttached({ timeout: 10000 });
    const className = (await this.coreToggle.getAttribute('class')) || '';
    if (!/\bexpanded\b/.test(className)) {
      await this.coreToggle.click({ force: true });
    }
    await expect(this.coreSection, 'Core Attributes section').toBeVisible({ timeout: 10000 });
  }

  /** Assert Core Attributes text/date fields are present and enabled. */
  async assertCoreFields(): Promise<void> {
    await this.expandCoreAttributes();
    for (const field of ALL_ALERTS_CORE_FIELDS) {
      const input = this.page.locator(`[id="${field.inputId}"]`);
      await expect(input, `core field ${field.inputId}`).toBeVisible({ timeout: 10000 });
      await expect(input, `core field ${field.inputId} enabled`).toBeEnabled();
      const label = this.page.locator(`label[for="${field.inputId}"]`);
      if ((await label.count()) > 0) {
        await expect(label, `label for ${field.inputId}`).toHaveText(field.label);
      }
    }
    await expect(this.page.getByRole('button', { name: /^search$/i }).first()).toBeVisible();
    await expect(this.page.getByRole('button', { name: /^clear$/i }).first()).toBeVisible();
  }

  /** Search by Alert ID (negative / smoke); Clear afterward when available. */
  async searchByAlertId(alertId: string): Promise<void> {
    await this.expandCoreAttributes();
    await this.alertIdInput.fill(alertId);
    await this.page.getByRole('button', { name: /^search$/i }).first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.assertOnAllAlertsPage();
    await expect(this.resultsTable, 'results after Alert ID search').toBeAttached({
      timeout: 20000,
    });
  }

  async clearSearchForm(): Promise<void> {
    const clear = this.page.getByRole('button', { name: /^clear$/i });
    await expect(clear.first()).toBeVisible();
    await clear.first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.assertOnAllAlertsPage();
  }

  /** Fill Main Customer Name then Clear — round-trip smoke. */
  async fillAndClearMainCustomerName(value: string): Promise<void> {
    await this.expandCoreAttributes();
    await this.mainCustomerNameInput.fill(value);
    await expect(this.mainCustomerNameInput).toHaveValue(value);
    await this.clearSearchForm();
    await this.expandCoreAttributes();
    await expect(this.mainCustomerNameInput).toHaveValue('');
  }

  /** Assert required Matching Alerts column headers; soft-check optional ones. */
  async assertRequiredGridHeaders(): Promise<string[]> {
    await expect(this.resultsTable).toBeAttached({ timeout: 15000 });
    const headerTexts = await this.resultsTable.locator('thead th').allTextContents();
    const normalized = headerTexts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);

    for (const required of ALL_ALERTS_REQUIRED_GRID_HEADERS) {
      const found = normalized.some((h) => required.test(h));
      expect(found, `required grid header matching ${required}`).toBeTruthy();
    }

    const missingOptional: string[] = [];
    for (const optional of ALL_ALERTS_OPTIONAL_GRID_HEADERS) {
      if (!normalized.some((h) => optional.test(h))) {
        missingOptional.push(String(optional));
      }
    }
    return missingOptional;
  }

  /** Presence of at least one column filter cell input/select in the results table. */
  async assertGridFilterRowChrome(): Promise<void> {
    await expect(this.resultsTable).toBeAttached({ timeout: 15000 });
    const filterControls = this.resultsTable.locator(
      '[id*="filterCell_0"], thead input, thead select',
    );
    await expect(filterControls.first(), 'grid column filter control').toBeAttached({
      timeout: 10000,
    });
  }
}
