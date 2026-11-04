/**
 * @plan specs/uniqa-jira-69-72.md §1, §2, §3, §4
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';
import {
  LEGAL_ENTITY_TYPE_FIELD,
  NEXT_REVIEW_DATE_FIELD,
  type CddOverride,
} from '../../../src/ui/pages/CustomerDetailsPage';
import { uiCustomers } from './uiCustomers';

const { corporate, personal } = uiCustomers;

const OVERRIDES: { override: CddOverride; ticket: string; caption: string; contributor: string }[] = [
  {
    override: 'incomeToOngoingPremium',
    ticket: 'UNIQA-70',
    caption: 'Override Income-to-Ongoing Premium Mismatch',
    contributor: 'Income-to-Ongoing Premium Mismatch Risk',
  },
  {
    override: 'sourceOfFundsToSinglePremium',
    ticket: 'UNIQA-71',
    caption: 'Override Source of Funds Amount-to-Single Premium Mismatch',
    contributor: 'Source of Funds Amount-to-Single Premium Mismatch Risk',
  },
  {
    override: 'employmentStatusToOngoingPremium',
    ticket: 'UNIQA-72',
    caption: 'Override Employment-Status-To-Ongoing-Premium-Mismatch',
    contributor: 'Employment Status-to-Ongoing Premium Mismatch Risk',
  },
];

// Parallel workers share one NetReveal session, and the customer search form and entity locks
// live in that session: run the whole file in order on one worker. Not `serial`, so one failure
// does not skip the rest.
test.describe.configure({ mode: 'default' });

test.beforeEach(async ({ page, mainMenu, customerSearch }) => {
  await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
  await mainMenu.assertNotOnLoginPage();
  await customerSearch.openFromMenu();
});

test.afterEach(async ({ customerDetails }) => {
  // Releases the entity lock taken by opening the customer (plan "Entity locks").
  await customerDetails.leave().catch(() => {});
});

test.describe('UNIQA-69 Legal Entity Type in Main KYC/CDD Risk Factors', () => {
  test('1.1 corporate customer shows its Legal Entity Type', async ({ customerSearch, customerDetails }) => {
    await customerSearch.openCustomer(corporate.customerId);
    await customerDetails.assertOnSummary();
    await expect(customerDetails.summaryCaption(LEGAL_ENTITY_TYPE_FIELD)).toHaveText('Legal Entity Type');
    await expect(customerDetails.summaryValue(LEGAL_ENTITY_TYPE_FIELD)).toHaveText(corporate.legalEntityType);
  });

  test('1.2 Legal Entity Type sits directly after Next Review Date', async ({ customerSearch, customerDetails }) => {
    await customerSearch.openCustomer(corporate.customerId);
    await customerDetails.assertOnSummary();
    await expect(customerDetails.summaryCaption(NEXT_REVIEW_DATE_FIELD)).toBeVisible();
    const captions = await customerDetails.summaryCaptions();
    expect(captions[captions.indexOf('Next Review Date') + 1], `captions: ${captions.join(', ')}`).toBe(
      'Legal Entity Type',
    );
  });

  test('1.3 Legal Entity Type is read-only', async ({ customerSearch, customerDetails }) => {
    await customerSearch.openCustomer(corporate.customerId);
    await customerDetails.assertOnSummary();
    await expect(customerDetails.summaryValue(LEGAL_ENTITY_TYPE_FIELD)).toHaveClass(/ab-read-only/);
    await expect(
      customerDetails.summarySection.locator(
        `span.fieldspan_${LEGAL_ENTITY_TYPE_FIELD} :is(input:not([type=hidden]), select, textarea)`,
      ),
      'editable control in Legal Entity Type',
    ).toHaveCount(0);
  });

  test('1.4 customer without a Legal Entity Type hides the field', async ({ customerSearch, customerDetails }) => {
    expect(personal.legalEntityType, 'test data: personal customer has no Legal Entity Type').toBe('');
    await customerSearch.openCustomer(personal.customerId);
    await customerDetails.assertOnSummary();
    await expect(customerDetails.summaryCaption(NEXT_REVIEW_DATE_FIELD)).toBeVisible();
    await expect(customerDetails.summaryCaption(LEGAL_ENTITY_TYPE_FIELD)).toHaveCount(0);
  });

  // No CDD / ODD alert exists on UNIQA QA (3 Nov 2026), so CDD Alert Details cannot be opened.
  // Needs an alert for a corporate customer with a Legal Entity Type (plan §1.5, §4).
  test.fixme('1.5 CDD Alert Details shows Legal Entity Type', async () => {});
});

test.describe('UNIQA-70, 71, 72 CDD Risk override fields', () => {
  test.beforeEach(async ({ customerSearch, customerDetails }) => {
    await customerSearch.openCustomer(personal.customerId);
    await customerDetails.openCddRiskTab();
  });

  for (const { override, ticket, caption } of OVERRIDES) {
    test(`2.1 ${ticket} field shows Yes or No in the CDD Risk section`, async ({ customerDetails }) => {
      await expect(customerDetails.overrideCaption(override)).toHaveText(caption);
      await expect(customerDetails.overrideValue(override)).toHaveText(/^(Yes|No)$/);
    });

    test(`2.2 ${ticket} pop-up offers No and Yes, Cancel changes nothing`, async ({ customerDetails }) => {
      const before = (await customerDetails.overrideValue(override).innerText()).trim();
      await customerDetails.openOverridePopup(override);
      await expect(customerDetails.popupFlagLabel(override)).toHaveText(caption);
      await expect(customerDetails.popupFlag(override).locator('option')).toHaveText(['No', 'Yes']);
      await expect(customerDetails.popupFlag(override).locator('option:checked'), 'pre-filled value').toHaveText(before);
      await expect(customerDetails.popupComment(override)).toBeEditable();
      await customerDetails.cancelOverridePopup(override);
      await expect(customerDetails.overrideValue(override)).toHaveText(before);
    });

    test(`2.3 ${ticket} pop-up shows no resource keys`, async ({ customerDetails }) => {
      // QA, 3 Nov 2026: the comment label reads "field.UNIQA_CDD_CommentChangeStatus.caption" in all
      // three pop-ups, and the UNIQA-70 Save button reads "button.UNIQA_Overr_Inc_OngFlag_Save.caption"
      // (plan findings D1, D2). Re-checked 3 Nov 2026 14:10: still present.
      test.fixme(true, 'Missing captions in messages.properties (plan D1, D2)');
      await customerDetails.openOverridePopup(override);
      await expect(customerDetails.overridePopup).not.toContainText(/\.caption\b/);
      await expect(customerDetails.popupSave(override)).toHaveText('Save');
      await customerDetails.cancelOverridePopup(override);
    });

    test(`3.1 ${ticket} set to Yes and back to No`, async ({ customerDetails }) => {
      // Writes CUSTOMER_DYNAMIC, an audit entry and NEED_RESCORE_FLAG: only on a NAT-created customer.
      expect(personal.customerId, 'override writes only to NAT test customers').toMatch(/^NAT/);
      try {
        await customerDetails.setOverride(override, 'Yes', `NAT automated test ${ticket}: set Yes`);
        await expect(customerDetails.overrideValue(override)).toHaveText('Yes');
        await customerDetails.openOverridePopup(override);
        await expect(customerDetails.popupFlag(override).locator('option:checked'), 'pre-filled value').toHaveText('Yes');
        await customerDetails.cancelOverridePopup(override);
      } finally {
        await customerDetails.setOverride(override, 'No', `NAT automated test ${ticket}: restore No`);
      }
      await expect(customerDetails.overrideValue(override)).toHaveText('No');
    });
  }
});

test.describe('UNIQA-70, 71, 72 override effect on the risk score', () => {
  // Needs a REST-created customer whose mismatch contributor scores > 0 (rt/rf RF11 / RF23 / RF34),
  // a rescore after the override, and the scoring change the Jira comments still mark [TO CONFIRM].
  // Blocked while the CDD service does not answer (SRV-30025, plan §4).
  for (const { ticket, contributor } of OVERRIDES) {
    test.fixme(`4.1 ${ticket} ${contributor} is 0 while overridden`, async () => {});
    test.fixme(`4.2 ${ticket} ${contributor} is scored normally when not overridden`, async () => {});
  }
});
