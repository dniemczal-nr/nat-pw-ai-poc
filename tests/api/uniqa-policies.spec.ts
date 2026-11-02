/**
 * @plan specs/uniqa-jira-80-96.md §3
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { codeWeight, contribution, firstBoundary, infoLists, newKeys, rangeWeight, sendCdd, weighted } from './uniqaCdd';

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
    test.fixme(true, 'IFS v1.6 txn is xs:all with one set of policy tags: no way to send a second policy (finding F13, UNIQA-92).');
  });

  test('a later REST value for the same policy replaces the earlier one', async ({ rt }) => {
    const keys = newKeys('POL3');
    const name = 'Total Single Premium Payments Risk';
    const list = 'TotalSinglePremiumPaymentsRisk';
    const [first, second] = [1000, 30000];
    expect(rangeWeight(list, first), 'test data: values must fall in different bands').not.toBe(rangeWeight(list, second));

    const premium = (amount: number) => ({
      TotalSinglePremiumToDate: amount.toFixed(2),
      LastSinglePremiumAmount: amount.toFixed(2),
      SourceOfFundsAmount: (amount * 10).toFixed(2),
    });
    const before = await sendCdd(rt, keys, premium(first));
    const after = await sendCdd(rt, keys, premium(second));

    expect(contribution(before, name).score).toBeCloseTo(weighted(name, rangeWeight(list, first)), 2);
    expect(contribution(after, name).score).toBeCloseTo(weighted(name, rangeWeight(list, second)), 2);
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
    const singleList = 'TotalSinglePremiumPaymentsRisk';
    const boundary = firstBoundary(singleList);
    const atBoundary = await sendCdd(rt, newKeys('RNG1'), {
      TotalSinglePremiumToDate: boundary.toFixed(2),
      LastSinglePremiumAmount: '1000.00',
      SourceOfFundsAmount: (boundary * 10).toFixed(2),
    });
    expect.soft(contribution(atBoundary, single).score, `${single} at ${boundary}`).toBeCloseTo(
      weighted(single, rangeWeight(singleList, boundary)),
      2,
    );

    // LastSinglePremiumAmount × 100 / SourceOfFundsAmount = 100 exactly.
    const ratio = 'Source of Funds Amount-to-Single Premium Mismatch Risk';
    const ratioList = 'SourceOfFundsAmountToSinglePremiumMismatchRisk';
    const atRatio = await sendCdd(rt, newKeys('RNG2'), { LastSinglePremiumAmount: '10000.00', SourceOfFundsAmount: '10000.00' });
    expect.soft(contribution(atRatio, ratio).score, `${ratio} at 100`).toBeCloseTo(weighted(ratio, rangeWeight(ratioList, 100)), 2);
  });

  test('Policy Count Risk for a customer with one policy', async ({ rt }) => {
    test.fixme(true, 'PolicyCountRisk ranges 0–1 / 2–3 / 4–9999 with [low, high) leave 1 and 3 unmatched (finding F4).');
    const name = 'Policy Count Risk';
    // UNIQA intent: one policy falls in the "Single active life insurance policy" row.
    const single = infoLists.PolicyCountRisk.find((row) => row.low === 0)!;
    const result = await sendCdd(rt, newKeys('CNT1'));
    expect(contribution(result, name).score).toBeCloseTo(weighted(name, single.weight), 2);
  });
});
