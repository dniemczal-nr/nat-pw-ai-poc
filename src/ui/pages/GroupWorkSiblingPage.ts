import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { MainMenuPage } from './MainMenuPage';

/** Group Work sibling screens (excludes All Alerts — covered by AllAlertsPage). */
export type GroupWorkSibling = {
  leafId: string;
  linkName: string;
  /** Regex matching page title / primary heading text. */
  title: RegExp;
  /** Primary search/filter region id — omit for list-only screens. */
  searchRegionId?: string;
  /** Results table id — omit when product shows text-only matching chrome. */
  resultsTableId?: string;
  /** Text landmark for Matching * region when no table id. */
  matchingText?: RegExp;
  /** Optional Organization Unit (or org) select id. */
  orgUnitSelectId?: string;
  /** Collapsed section toggle to reveal OU (if any). */
  orgUnitExpandToggleId?: string;
  skip?: string;
};

export const GROUP_WORK_SIBLINGS: GroupWorkSibling[] = [
  {
    leafId: 'menu-item_group_work_path_menu-item_hibernated_alerts_path',
    linkName: 'Hibernated Alerts',
    title: /hibernated alerts/i,
    searchRegionId: 'COMPL_HibernatedAlers_Search',
    resultsTableId: 'COMPL_HibernatedAlerts_Results_interactiveListTable',
  },
  {
    leafId: 'menu-item_group_work_path_menu-item_alerting_subjects_path',
    linkName: 'Alerting Subjects',
    title: /alerting subjects/i,
    // List-only worklist — no EIM search form beyond global FTS.
    resultsTableId: 'EIM_AlertingSubjects_interactiveListTable',
  },
  {
    leafId: 'menu-item_group_work_path_menu-item_all_cases_path',
    linkName: 'All Cases',
    title: /search all cases|all cases/i,
    searchRegionId: 'EIM_SearchCase_1',
    resultsTableId: 'EIM_ListCaseSearchResults_1_interactiveListTable',
    orgUnitSelectId: 'EIM_SearchCase_1__ORGUNIT_ID',
    // Live UNIQA: OU lives under Supplementary / Other Attributes.
    orgUnitExpandToggleId: 'EIM_SearchOtherAttributes',
  },
  {
    leafId: 'menu-item_group_work_path_menu-item_all_minor_groups_path',
    linkName: 'All Minor Groups',
    title: /search minor groups|minor groups/i,
    searchRegionId: 'EIM_SearchMinorGroup',
    matchingText: /matching minor groups/i,
    orgUnitSelectId: 'EIM_SearchMinorGroup__ORG_UNIT_ID',
  },
  {
    leafId: 'menu-item_group_work_path_menu-item_all_e-files_path',
    linkName: 'All E-Files',
    title: /e-?files/i,
    skip: 'All E-Files is not present in the UNIQA QA menu for this admin user',
  },
];

/**
 * Thin POM for Group Work sibling worklists (Hibernated / Subjects / Cases / Minor Groups).
 */
export class GroupWorkSiblingPage extends BasePage {
  readonly mainMenu: MainMenuPage;

  constructor(page: Page) {
    super(page);
    this.mainMenu = new MainMenuPage(page);
  }

  async open(sibling: GroupWorkSibling): Promise<void> {
    await this.mainMenu.openLeaf(sibling.leafId, sibling.linkName);
    await this.assertScreenChrome(sibling);
  }

  async assertScreenChrome(sibling: GroupWorkSibling): Promise<void> {
    await this.mainMenu.assertNotOnLoginPage();
    await expect(
      this.page.getByText(sibling.title).first(),
      `${sibling.linkName} title landmark`,
    ).toBeVisible({ timeout: 20000 });

    if (sibling.searchRegionId) {
      await expect(
        this.page.locator(`[id="${sibling.searchRegionId}"]`),
        `${sibling.linkName} search region`,
      ).toBeVisible({ timeout: 15000 });
    }

    if (sibling.resultsTableId) {
      await expect(
        this.page.locator(`[id="${sibling.resultsTableId}"]`),
        `${sibling.linkName} results table`,
      ).toBeAttached({ timeout: 15000 });
    } else if (sibling.matchingText) {
      await expect(
        this.page.getByText(sibling.matchingText).first(),
        `${sibling.linkName} matching region`,
      ).toBeVisible({ timeout: 15000 });
    }
  }

  orgUnitSelect(selectId: string): Locator {
    return this.page.locator(`[id="${selectId}"]`);
  }

  /**
   * When the sibling exposes an Organization Unit control, assert it is operable.
   * Returns false when the control is absent (caller may annotate).
   */
  async assertOrgUnitIfPresent(sibling: GroupWorkSibling): Promise<boolean> {
    if (!sibling.orgUnitSelectId) {
      return false;
    }

    if (sibling.orgUnitExpandToggleId) {
      const toggle = this.page.locator(`[id="${sibling.orgUnitExpandToggleId}"]`);
      if ((await toggle.count()) > 0) {
        const className = (await toggle.getAttribute('class')) || '';
        if (!/\bexpanded\b/.test(className)) {
          await toggle.click({ force: true });
        }
      }
    }

    const select = this.orgUnitSelect(sibling.orgUnitSelectId);
    if ((await select.count()) === 0) {
      return false;
    }

    await expect(select, `${sibling.linkName} Organization Unit`).toBeVisible({ timeout: 10000 });
    await expect(select).toBeEnabled();
    const optionCount = await select.locator('option').count();
    expect(optionCount, `${sibling.linkName} OU options`).toBeGreaterThan(0);
    await select.click({ force: true });
    await this.page.locator('body').click({ position: { x: 5, y: 5 }, force: true });
    return true;
  }
}
