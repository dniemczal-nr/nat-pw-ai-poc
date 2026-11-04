import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** Legal Entity Type field (UNIQA-69) in the Main KYC/CDD Risk Factors block of the summary. */
export const LEGAL_ENTITY_TYPE_FIELD = 'UNIQA_BioSummary_LegalEntityType';
export const NEXT_REVIEW_DATE_FIELD = 'EIM_BioSummary_NextReviewDate';

/**
 * Override flags in the CDD Risk section (UNIQA-70, 71, 72), with the pop-up each field opens.
 * Ids are the configured field / section / datafield / button names; the pop-ups share the
 * `UNIQA_EmplStatusFlag_Cancel` button.
 */
export const CDD_OVERRIDES = {
  incomeToOngoingPremium: {
    field: 'UNIQA_CDD_Overr_Inc_Ong',
    popup: 'UNIQA_CDD_Overr_Inc_OngFlag',
    flag: 'OVRD_INC_ONG_MSMT_FLG',
    save: 'UNIQA_Overr_Inc_OngFlag_Save',
  },
  sourceOfFundsToSinglePremium: {
    field: 'UNIQA_CDD_Overr_SourceOfFunds',
    popup: 'UNIQA_CDD_OVERR_SourceOfFundsFlag',
    flag: 'OVERR_SOF_FLAG',
    save: 'UNIQA_OverrSOFFlag_Save',
  },
  employmentStatusToOngoingPremium: {
    field: 'UNIQA_CDD_Overr_EmploymentStatus',
    popup: 'UNIQA_CDD_Overr_EmplToOngoingPopUp',
    flag: 'OVERR_EMPL_STATUS_FLAG',
    save: 'UNIQA_EmplStatusFlag_Save',
  },
} as const;

export type CddOverride = keyof typeof CDD_OVERRIDES;

const COMMENT_FIELD = 'UNIQA_CDD_CommentChangeStatus';
const CANCEL_BUTTON = 'UNIQA_EmplStatusFlag_Cancel';

/**
 * Customer details screen: Summary tab (personal `EIM__PersonalCustomerSummary` /
 * corporate `EIM__CorporateCustomerSummaryExtended`) and the CDD Risk tab (`CDD_Customer_Risk`).
 */
export class CustomerDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Biographical Summary (personal) or Company Overview (corporate). */
  get summarySection(): Locator {
    return this.page.locator('#EIM_BiographicalSummaryNew, #EIM_CompanyOverviewNew');
  }

  private get cddRiskSection(): Locator {
    return this.page.locator('#CDD_CustRiskHead');
  }

  /** Only one override pop-up is open at a time. */
  get overridePopup(): Locator {
    return this.page.locator('#screenPopupContainer');
  }

  /**
   * Opening a customer takes an entity lock (CFG-80017) that only toolbar navigation releases
   * (`clearLocks=true`). A test that just closes the browser leaves the lock, and the next session
   * gets read-only override pop-ups. Call this when done with the customer.
   */
  async leave(): Promise<void> {
    await this.page.locator('[id^="EIM_EntityDetails_Toolbar"]').first().waitFor({ timeout: 5000 });
    await this.page.getByRole('button', { name: 'Home', exact: true }).first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async assertOnSummary(): Promise<void> {
    await expect(this.summarySection, 'customer summary section').toBeVisible({ timeout: 20000 });
  }

  summaryCaption(field: string): Locator {
    return this.summarySection.locator(`span.captionspan_${field}`);
  }

  summaryValue(field: string): Locator {
    return this.summarySection.locator(`span.fieldspan_${field} .ab-value`);
  }

  /** Field captions of the summary section in screen order. */
  async summaryCaptions(): Promise<string[]> {
    return (await this.summarySection.locator('span.pairLeft').allInnerTexts()).map((t) => t.trim());
  }

  async openCddRiskTab(): Promise<void> {
    // The tab bar renders each tab twice (visible bar + overflow menu).
    await this.page.locator('[id="CDD_CustRiskHeadtab"]').first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.cddRiskSection, 'CDD Risk section').toBeVisible({ timeout: 20000 });
  }

  overrideCaption(override: CddOverride): Locator {
    return this.cddRiskSection.locator(`span.captionspan_${CDD_OVERRIDES[override].field}`);
  }

  overrideValue(override: CddOverride): Locator {
    return this.cddRiskSection.locator(`span.fieldspan_${CDD_OVERRIDES[override].field} .ab-value`);
  }

  async openOverridePopup(override: CddOverride): Promise<void> {
    const { field, popup } = CDD_OVERRIDES[override];
    await this.cddRiskSection.locator(`[id="popup_null__${field}__${popup}"]`).click();
    await expect(this.page.locator(`[id="${popup}"]`), `${override} pop-up`).toBeVisible({ timeout: 15000 });
    await expect(
      this.popupFlag(override),
      'override flag enabled (disabled = customer locked by another session; see Administration → Lock Manager)',
    ).toBeEnabled();
  }

  popupFlag(override: CddOverride): Locator {
    const { popup, flag } = CDD_OVERRIDES[override];
    return this.overridePopup.locator(`[id="${popup}__${flag}"]`);
  }

  popupFlagLabel(override: CddOverride): Locator {
    const { popup, flag } = CDD_OVERRIDES[override];
    return this.overridePopup.locator(`label[for="${popup}__${flag}"]`);
  }

  popupComment(override: CddOverride): Locator {
    return this.overridePopup.locator(`[id="${CDD_OVERRIDES[override].popup}__${COMMENT_FIELD}"]`);
  }

  popupCommentLabel(override: CddOverride): Locator {
    return this.overridePopup.locator(`label[for="${CDD_OVERRIDES[override].popup}__${COMMENT_FIELD}"]`);
  }

  /** By id: the UNIQA-70 Save button has no caption on QA (shows its resource key). */
  popupSave(override: CddOverride): Locator {
    const { popup, save } = CDD_OVERRIDES[override];
    return this.overridePopup.locator(`a[id^="${popup}${save}"]`);
  }

  popupCancel(override: CddOverride): Locator {
    return this.overridePopup.locator(`a[id^="${CDD_OVERRIDES[override].popup}${CANCEL_BUTTON}"]`);
  }

  async cancelOverridePopup(override: CddOverride): Promise<void> {
    await this.popupCancel(override).click();
    await expect(this.page.locator(`[id="${CDD_OVERRIDES[override].popup}"]`)).toBeHidden({ timeout: 10000 });
  }

  /** Runs the override workflow action (writes CUSTOMER_DYNAMIC, audit, rescore flag). */
  async setOverride(override: CddOverride, value: 'Yes' | 'No', comment: string): Promise<void> {
    await this.openOverridePopup(override);
    await this.popupFlag(override).selectOption({ label: value });
    await this.popupComment(override).fill(comment);
    await this.popupSave(override).click();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.locator(`[id="${CDD_OVERRIDES[override].popup}"]`)).toBeHidden({ timeout: 20000 });
  }
}
