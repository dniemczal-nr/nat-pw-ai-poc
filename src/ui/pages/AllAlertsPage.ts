import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

type FieldKind = 'text' | 'date' | 'select' | 'selectOrText';

/**
 * WLM view search fields by their NAT DataTable name — NAT AllAlertsPage.fillWlmViewSearchCriteriaFaster
 * (fieldActions) with the @FindBy of each field. `date` accepts <today> (dd/MM/yyyy, as NAT resolveToday).
 */
const WLM_SEARCH_FIELDS: Record<string, { css: string; kind: FieldKind }> = {
  'Alert ID': { css: 'input[id*="Search_AlertID"], input[id*="SearchAlertId"]', kind: 'text' },
  'Message ID': { css: 'input[id="SNB_WLM_AlertsSearch__WLM_AlertsSearch_MessageID"]', kind: 'text' },
  'Unique Message Reference': { css: 'input[id="SNB_WLM_AlertsSearch__SNB_WLM_Unique_Message_Reference"]', kind: 'text' },
  'Transaction Reference 20': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Transaction_Reference_20"]', kind: 'text' },
  'Transaction Reference 21': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Transaction_Reference_21"]', kind: 'text' },
  'Date From': { css: '[id="SNB_WLM_AlertsSearch__WLM_AlertsSearch_CreatedBetween__FROM"]', kind: 'date' },
  'Date To': { css: '[id="SNB_WLM_AlertsSearch__WLM_AlertsSearch_CreatedBetween__TO"]', kind: 'date' },
  'Message Direction': { css: 'select[id*="SNB_WLM_AlertsSearch__AT_TXN_DIRECTION"]', kind: 'select' },
  'Assigned To': { css: 'input[id*="SNB_WLM_AlertsSearch__WLM_AlertsSearch_AssignedTo"]', kind: 'text' },
  'Assigned By': { css: 'input[id*="SNB_WLM_AlertsSearch__WLM_AlertsSearch_AssignedBy"]', kind: 'text' },
  'Active/Inactive': { css: 'select[id*="ACTIVE_FLAG"]', kind: 'select' },
  // NAT: //select[contains(@id,'STATUS_ID')] | //div[contains(@id,'Status')]//input
  Status: { css: 'select[id*="STATUS_ID"], div[id*="Status"] input', kind: 'selectOrText' },
  'Type/Sub-Type': { css: 'select[id*="DOMAIN_ID"]', kind: 'select' },
  'Data Source': { css: 'select[id*="SNB_WLM_AlertsSearch__AT_DATASOURCE_ID"]', kind: 'select' },
  'Detection Check': { css: 'select[id*="SNB_WLM_AlertsSearch__REASON_GROUP_DEF_ID"]', kind: 'select' },
  'Amount Between': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Txn_Amount__FROM"]', kind: 'text' },
  Currency: { css: 'select[id*="SNB_WLM_AlertsSearch__AT_TXN_CURRENCY"]', kind: 'select' },
  'Requester Account Number - IBAN': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Requester_Account"]', kind: 'text' },
  'Requester Account - IBAN': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Requester_Account"]', kind: 'text' },
  'Receiver Account Number - IBAN': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Receiver_Account"]', kind: 'text' },
  'Receiver Account - IBAN': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Receiver_Account"]', kind: 'text' },
  'Requester Name': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Requester_Name"]', kind: 'text' },
  'Receiver Name': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Receiver_Name"]', kind: 'text' },
  'Receiver BIC': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Receiver_BIC"]', kind: 'text' },
  'Sender BIC': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Sender_BIC"]', kind: 'text' },
  'Third Party BIC': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Third_Party_BIC"]', kind: 'text' },
  'Information Requested?': { css: 'select[id*="SNB_WLM_AlertsSearch__SNB_INFORMATION_REQUESTED_FLAG"]', kind: 'select' },
  'Follow-up': { css: 'select[id*="SNB_WLM_AlertsSearch__SNB_FOLLOW_UP_FLAG"]', kind: 'select' },
  'Value Date': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_Txn_Value_Date__FROM"]', kind: 'date' },
  'Priority?': { css: 'select[id*="SNB_WLM_AlertsSearch__SNB_PRIORITY_FLAG"]', kind: 'select' },
  'BPS Flag': { css: 'select[name="SNB_BPS_FLAG"], select[id*="SNB_BPS_FLAG"]', kind: 'select' },
  'Transaction Message ID': { css: 'input[id="SNB_WLM_AlertsSearch__SNB_WLM_TransactionMessageID_Edit"]', kind: 'text' },
  'Transaction End to End ID': { css: 'input[id="SNB_WLM_AlertsSearch__SNB_WLM_TransactionEndtoEndID_Edit"]', kind: 'text' },
  'Transaction Instruction ID': { css: 'input[id="SNB_WLM_AlertsSearch__SNB_WLM_TransactionInstructionID_Edit"]', kind: 'text' },
  'QP/MG Message Transaction ID': {
    css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_QP_MG_Transaction_ID"], input[name="SNB_QP_MG_TRANSACTION_ID"]',
    kind: 'text',
  },
  'Customer ID': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_CustomerIdSearch"]', kind: 'text' },
  'Main Customer ID': { css: 'input[id*="SNB_WLM_AlertsSearch__WLM_AlertsSearch_SubjectID"]', kind: 'text' },
  'Receiver ID': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_ReceiverID"]', kind: 'text' },
  'Transaction Code': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_TransactionCode"]', kind: 'text' },
  'Transaction Type': { css: 'input[id*="SNB_WLM_AlertsSearch__SNB_WLM_TransactionType"]', kind: 'text' },
};

export const WLM_SEARCH_FIELD_NAMES = Object.keys(WLM_SEARCH_FIELDS);

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Group Work → All Alerts. Selectors migrated from NAT AllAlertsPage:
 * - searchButton: //span[contains(@id,'Search')][contains(text(),'Search')]
 * - allAlertPageViewButton: //span[contains(@id,'ContextSwitch_Alert0')]
 * - chooseViewDropdown: //span[contains(@id,'ontextSwitch')]/img/parent::span
 * - select*ViewButton: //a[contains(@type,'button') and contains(@title,'Select Watc')]
 * - results: //table[contains(@id,'AlertsSearchResults')] (isResultsTableEmpty / selectFirstNotLockedCddAlert)
 * - unlocked alert: rows without .//td[contains(@class,'ROW_LOCK')]//img → .//td[contains(@class,'ALERT_IDENTIFIER')]//a
 */
export class AllAlertsPage extends BasePage {
  readonly searchButton: Locator;
  /** Label of the active result view. */
  readonly currentView: Locator;
  readonly viewSwitcher: Locator;
  readonly resultsTable: Locator;
  /** Alert id links in rows without a lock icon. */
  readonly alertLinks: Locator;
  /** Present only on All Alerts: view switcher label, Search button or the result list. */
  readonly screenMarker: Locator;

  constructor(page: Page) {
    super(page);
    this.searchButton = page
      .locator('span[id*="Search"]')
      .filter({ hasText: /^\s*Search\s*$/ })
      .filter({ visible: true })
      .first();
    this.currentView = page.locator('span[id*="ContextSwitch_Alert0"]').first();
    this.viewSwitcher = page.locator('span[id*="ontextSwitch"]:has(> img)').first();
    // e.g. SNB_WLM_AlertsSearchResults_interactiveListTable (its overlay: …_interactiveListTable_processing)
    this.resultsTable = page.locator('table[id*="AlertsSearchResults"][id*="interactiveListTable"]');
    this.alertLinks = this.resultsTable
      .locator('tbody tr')
      .filter({ hasNot: page.locator('td.ROW_LOCK img') })
      .locator('td.ALERT_IDENTIFIER a');
    this.screenMarker = this.currentView.or(this.searchButton).or(this.resultsTable).first();
  }

  /**
   * NAT expandPanelsUsingHelper: open the collapsed criteria panels (Supplementary attributes,
   * Assignment attributes, Linked to) so their fields can be filled.
   */
  private async expandCriteriaPanels(): Promise<void> {
    for (const css of ['a[id*="SupplementaryAttr"]', 'a[id*="AssignmentAttr"]', 'a[id*="LinkedTo"]']) {
      const header = this.page.locator(css).filter({ visible: true }).first();
      if (await header.count()) await header.click({ timeout: 2000 }).catch(() => undefined);
    }
  }

  /**
   * NAT step "I am providing and submitting a search criteria in WLM view on All Alerts" — fill
   * every `field | value` (NAT field names). Unknown field names fail fast with the supported list.
   */
  async fillWlmSearchCriteria(criteria: [string, string][]): Promise<void> {
    let expanded = false;
    for (const [field, raw] of criteria) {
      const def = WLM_SEARCH_FIELDS[field];
      if (!def) {
        throw new Error(`Unsupported WLM search field "${field}". Supported: ${WLM_SEARCH_FIELD_NAMES.join(', ')}`);
      }
      const value = def.kind === 'date' && raw.toLowerCase() === '<today>' ? today() : raw;
      const input = this.page.locator(def.css).first();
      if (!expanded && !(await input.isVisible())) {
        await this.expandCriteriaPanels();
        expanded = true;
      }
      await input.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        throw new Error(`WLM search field "${field}" not visible (${def.css})`);
      });
      const isSelect = (await input.evaluate((el) => el.tagName)).toLowerCase() === 'select';
      if (def.kind === 'select' || (def.kind === 'selectOrText' && isSelect)) {
        await input.selectOption({ label: value });
      } else {
        await input.fill(value);
      }
    }
  }

  /** NAT view buttons are titled "Select <View> View" (Generic, Watch List Manager, Insurance). */
  viewOption(view: string): Locator {
    return this.page.locator(`a[type*="button"][title*="Select ${view}"]`).first();
  }

  async isViewActive(view: string): Promise<boolean> {
    if (!(await this.currentView.isVisible())) return false;
    return (await this.currentView.innerText()).includes(view);
  }

  async openViewSwitcher(): Promise<void> {
    await this.viewSwitcher.click();
    await this.viewOption('').waitFor({ state: 'visible' });
  }

  async chooseView(view: string): Promise<void> {
    await this.viewOption(view).click();
  }

  /** The Search button is hidden while the criteria panel is collapsed (e.g. results of a previous search). */
  async ensureSearchVisible(): Promise<void> {
    if (await this.searchButton.isVisible()) return;
    await this.expandCriteriaPanels();
    await this.searchButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  /** NAT: the fixed div#floating-scrollbar can cover the button at the bottom — centre it first. */
  async clickSearch(): Promise<void> {
    await this.searchButton.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await this.searchButton.click();
  }

  async alertCount(): Promise<number> {
    return this.alertLinks.count();
  }

  /**
   * Open the unlocked alert in row `index`. Virtual users pick different rows so they do not
   * all open — and lock — the same alert.
   */
  async openAlert(index: number): Promise<void> {
    const link = this.alertLinks.nth(index);
    await link.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await link.click();
  }
}
