/**
 * @plan specs/uniqa-jira-80-96.md §3
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import {
  codeWeight,
  contribution,
  newKeys,
  rangeWeight,
  sendCdd,
  singlePremiumBoundary,
  singlePremiumWeight,
  weighted,
} from './uniqaCdd';

// The baseline message is a personal customer: single premiums use the sheet's natural-person rows.
const PERSON = 'P';

test.describe('Policies in a REST request', () => {
  test.describe.configure({ timeout: 3 * 60_000 });

  test('one policy is scored from its policy fields', async ({ rt }) => {
    const fields = { PaymentMethod: 'CASH', SubscriptionChannel: 'ONLINE', BusinessPurpose: 'WEALTH_TRANSFER' };
    const result = await sendCdd(rt, newKeys('POL1'), fields);

    const expected: [string, string, string][] = [
      ['Policy Payment Method Risk', 'PolicyPaymentMethodRisk', fields.PaymentMethod],
      ['Sales Channel Risk', 'SalesChannelRisk', fields.SubscriptionChannel],
      ['Business Purpose Risk', 'BusinessPurposeRisk', fields.BusinessPurpose],
    ];
    for (const [name, list, code] of expected) {
      expect.soft(contribution(result, name).score, name).toBeCloseTo(weighted(name, codeWeight(list, code)), 2);
    }
  });

  test('payor other than holder and third-party account are scored', async ({ rt }) => {
    const result = await sendCdd(rt, newKeys('POL2'), { PolicyPayorName: 'Other Payor', OnOwnAccountFlag: 'N' });

    expect.soft(contribution(result, 'Third Party Premium Payer Risk').score).toBeCloseTo(
      weighted('Third Party Premium Payer Risk', codeWeight('ThirdPartyPremiumPayerRisk', 'Y')),
      2,
    );
    expect.soft(contribution(result, 'On Own Account Risk').score).toBeCloseTo(
      weighted('On Own Account Risk', codeWeight('OnOwnAccountRisk', 'N')),
      2,
    );
  });

  test('two or more policies in one request are each processed', async () => {
    test.fixme(true, 'IFS §7.1.6 txn is xs:all with one set of policy tags: no way to send a second policy (finding F13, UNIQA-92).');
  });

  test('a later REST value for the same policy replaces the earlier one', async ({ rt }) => {
    const keys = newKeys('POL3');
    const name = 'Total Single Premium Payments Risk';
    const [first, second] = [1000, 150000];
    expect(singlePremiumWeight(PERSON, first), 'test data: values must fall in different bands').not.toBe(
      singlePremiumWeight(PERSON, second),
    );

    const premium = (amount: number) => ({
      TotalSinglePremiumToDate: amount.toFixed(2),
      LastSinglePremiumAmount: amount.toFixed(2),
      SourceOfFundsAmount: (amount * 10).toFixed(2),
    });
    const before = await sendCdd(rt, keys, premium(first));
    const after = await sendCdd(rt, keys, premium(second));

    expect(contribution(before, name).score).toBeCloseTo(weighted(name, singlePremiumWeight(PERSON, first)), 2);
    expect(contribution(after, name).score).toBeCloseTo(weighted(name, singlePremiumWeight(PERSON, second)), 2);
  });

  test('multivalue policy codes are stored without added spaces', async () => {
    test.fixme(true, 'Needs the read-only DbClient (§4) to read the stored policy row (UNIQA-91).');
  });

  test('retention flags keep the policy in cdd_policy_intra_day for 24 hours', async () => {
    test.fixme(true, 'Needs the read-only DbClient (§4) to read apps.cdd_policy_intra_day (UNIQA-91).');
  });

  test('aggregations across policies', async () => {
    test.fixme(true, 'Needs two policies per customer: blocked by F13 for REST, and by the DbClient (§4) for the view.');
  });

  test('range lookups are half-open at the boundaries', async ({ rt }) => {
    const single = 'Total Single Premium Payments Risk';
    // First RANGE_LOW of the UNIQA sheet (100 000 for a person): the next band, under either reading
    // of the inclusive sheet RANGE_HIGH (finding F10).
    const boundary = singlePremiumBoundary(PERSON);
    const atBoundary = await sendCdd(rt, newKeys('RNG1'), {
      TotalSinglePremiumToDate: boundary.toFixed(2),
      LastSinglePremiumAmount: '1000.00',
      SourceOfFundsAmount: (boundary * 10).toFixed(2),
    });
    expect.soft(contribution(atBoundary, single).score, `${single} at ${boundary}`).toBeCloseTo(
      weighted(single, singlePremiumWeight(PERSON, boundary)),
      2,
    );

    // LastSinglePremiumAmount / SourceOfFundsAmount = 1.05 exactly: the sheet's "> 105 %" row
    // (ratio scale as in the sheet; unconfirmed until QA returns the contributor).
    const ratio = 'Source of Funds Amount-to-Single Premium Mismatch Risk';
    const ratioList = 'SourceOfFundsAmountToSinglePremiumMismatchRisk';
    const atRatio = await sendCdd(rt, newKeys('RNG2'), { LastSinglePremiumAmount: '10500.00', SourceOfFundsAmount: '10000.00' });
    expect.soft(contribution(atRatio, ratio).score, `${ratio} at 105 %`).toBeCloseTo(
      weighted(ratio, rangeWeight(ratioList, 1.05)),
      2,
    );
  });

  test('Policy Count Risk for a customer with one policy', async ({ rt }) => {
    // The org unit row wins over SHA (Gert, 4 Nov 2026), so one UQ_AUT policy expects the UQ_AUT row
    // 0–1000 = 0. QA, 4 Nov 2026, scores the SHA row [1, 2) = 1 instead (finding F17); the sheet is
    // due on QA with the next redeployment.
    test.fixme(true, 'QA scores the SHA PolicyCountRisk row [1, 2) = 1, not the UQ_AUT row 0–1000 = 0 (finding F17); re-check after the QA redeployment.');
    const name = 'Policy Count Risk';
    const result = await sendCdd(rt, newKeys('CNT1'));
    expect(contribution(result, name).score).toBeCloseTo(weighted(name, rangeWeight('PolicyCountRisk', 1)), 2);
  });
});
