/**
 * @plan specs/uniqa-jira-80-96.md §2
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { codeWeight, contribution, newKeys, sendCdd, weighted } from './uniqaCdd';

const CONTRIBUTOR = 'Source Of Funds Risk';
const LIST = 'SourceOfFundsRisk';

test.describe('Source of Funds multivalue', () => {
  test.describe.configure({ timeout: 2 * 60_000 });

  test('single code contributes its weight from the default org unit', async ({ rt }) => {
    // UQ_AUT has no SourceOfFundsRisk rows, so the lookup falls back to SHA (plan 2.1 + 2.3).
    const code = 'Funds won through gambling';
    const result = contribution(await sendCdd(rt, newKeys('SOF1'), { SourceOfFunds: code }), CONTRIBUTOR);

    expect(result.score).toBeCloseTo(weighted(CONTRIBUTOR, codeWeight(LIST, code)), 2);
    expect(result.dimension).toBe('Customer');
    expect.soft(result.info, 'score information names the value').toContain(code);
  });

  test('comma-separated codes contribute the highest weight', async ({ rt }) => {
    test.fixme(true, 'Spec v1.3 §4.7.41 still defines a single-value Condition scenario (finding F1, UNIQA-86).');
    // Both codes fit the 50-character SourceOfFunds limit together (finding F15).
    const codes = ['Returns from investments', 'Funds received as a loan'];
    const result = contribution(await sendCdd(rt, newKeys('SOF2'), { SourceOfFunds: codes.join(',') }), CONTRIBUTOR);

    const highest = Math.max(...codes.map((code) => codeWeight(LIST, code)));
    expect(result.score).toBeCloseTo(weighted(CONTRIBUTOR, highest), 2);
    for (const code of codes) expect.soft(result.info).toContain(code);
  });
});
