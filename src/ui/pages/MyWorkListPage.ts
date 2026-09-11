import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { MainMenuPage } from './MainMenuPage';

/** Analyst worklist leaf under My Work (read-only chrome). */
export type MyWorkWorklist = {
  leafId: string;
  linkName: string;
  title: RegExp;
  /** Results table id when product renders interactiveListTable. */
  resultsTableId?: string;
  /** Empty / landmark text when no table id (e.g. Minor Groups). */
  emptyOrLandmark?: RegExp;
};

export const MY_WORK_WORKLISTS: MyWorkWorklist[] = [
  {
    leafId: 'menu-item_my_work_path_menu-item_my_alerts_path_menu-item_my_activealerts_path',
    linkName: 'My Active Alerts',
    title: /my alerts/i,
    resultsTableId: 'EIM_MyAlertsSearchResults_interactiveListTable',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_cases_path_menu-item_my_active_cases_path',
    linkName: 'My Active Cases',
    title: /my cases/i,
    resultsTableId: 'EIM_MyCases_interactiveListTable',
  },
  {
    leafId:
      'menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_my_minor_groups_path',
    linkName: 'My Minor Groups',
    title: /my minor groups/i,
    emptyOrLandmark: /no rows found|my minor groups/i,
  },
];

export const MY_WORK_LANDMARK_SCREENS: MyWorkWorklist[] = [
  {
    leafId: 'menu-item_my_work_path_menu-item_my_tasks_path_menu-item_daily_view_path',
    linkName: 'Daily View',
    title: /my tasks.*daily|daily view/i,
    emptyOrLandmark: /no rows found|daily view|tasks for|my tasks/i,
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_notifications_path_menu-item_inbox_path',
    linkName: 'Inbox',
    title: /notifications.*inbox|inbox/i,
    emptyOrLandmark: /no rows found|inbox|notifications/i,
  },
];

/**
 * Thin POM for My Work analyst worklists (read-only).
 * No Assign / Claim / Create / Get Next / Mark Done.
 */
export class MyWorkListPage extends BasePage {
  readonly mainMenu: MainMenuPage;

  constructor(page: Page) {
    super(page);
    this.mainMenu = new MainMenuPage(page);
  }

  async open(worklist: MyWorkWorklist): Promise<void> {
    await this.mainMenu.openLeaf(worklist.leafId, worklist.linkName);
    try {
      await this.assertWorklistChrome(worklist);
    } catch (firstError) {
      // One retry from a clean shell — long suites can leave a stale content frame.
      const { resolveBaseUrl } = await import('../browserManager');
      await this.page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
      await this.mainMenu.openLeaf(worklist.leafId, worklist.linkName);
      try {
        await this.assertWorklistChrome(worklist);
      } catch {
        throw firstError;
      }
    }
  }

  async assertWorklistChrome(worklist: MyWorkWorklist): Promise<void> {
    await this.mainMenu.assertNotOnLoginPage();

    // Menu tree keeps matching labels attached-but-hidden; prefer results table /
    // visible main-content landmarks over raw getByText().first().
    if (worklist.resultsTableId) {
      const table = this.page.locator(`[id="${worklist.resultsTableId}"]`);
      await expect(table, `${worklist.linkName} results table`).toBeAttached({
        timeout: 20000,
      });
      await expect(table.locator('thead th').first(), 'worklist header cell').toBeAttached();
      return;
    }

    const landmark = worklist.emptyOrLandmark ?? worklist.title;
    await expect(
      this.page.getByText(landmark).filter({ visible: true }).first(),
      `${worklist.linkName} landmark / empty chrome`,
    ).toBeVisible({ timeout: 20000 });
  }

  resultsTable(resultsTableId: string): Locator {
    return this.page.locator(`[id="${resultsTableId}"]`);
  }
}
