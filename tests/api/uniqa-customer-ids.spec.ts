/**
 * @plan specs/uniqa-jira-80-96.md §1
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import type { ScoreContribution } from '../../src/api/cddApplication';
import {
  codeWeight,
  contribution,
  infoLists,
  newKeys,
  ORG_UNIT,
  sendCdd,
  sendCddResponse,
  weighted,
} from './uniqaCdd';

const NATIONALITY = 'Nationality Risk';
/** `nationality_code_list` is char 50 (UNIQA-85); the XSD enforces the same `maxLength`. */
const NATIONALITY_LIST_LENGTH = 50;
/** 17 two-letter codes: the longest list that fits 50 characters. */
const LONGEST = ['DE', 'FR', 'IT', 'BE', 'PL', 'CN', 'AT', 'ES', 'PT', 'NL', 'SE', 'DK', 'FI', 'IE', 'LU', 'CZ', 'SK'];

test.describe('Customer identifiers and nationality list', () => {
  test.describe.configure({ timeout: 2 * 60_000 });

  test('OB message with InternalCustomerId different from CustomerSourceUniqueId is accepted', async ({ rt }) => {
    const keys = newKeys('ID1');
    const result = await sendCdd(rt, keys, { InternalCustomerId: `INT${keys.customerId}`.slice(0, 32) });

    expect(result.risk, 'CDDRisk').toBeTruthy();
  });

  test('OB message without InternalCustomerId stores CustomerSourceUniqueId as InternalCustomerId', async ({ rt }) => {
    test.fixme(true, 'Needs the read-only DbClient (§4): the OB response does not return InternalCustomerId (UNIQA-81).');
    await sendCdd(rt, newKeys('ID2'));
  });

  test('NationalityCode as comma list is accepted', async ({ rt }) => {
    const result = await sendCdd(rt, newKeys('NAT1'), { NationalityCode: 'CN,DE' });
    expect(result.risk, 'CDDRisk').toBeTruthy();
  });

  test('NationalityCode list is stored in nationality_code_list', async ({ rt }) => {
    test.fixme(true, 'Needs the read-only DbClient (§4): nationality_code_list / nationality_code are not in the response (UNIQA-85).');
    await sendCdd(rt, newKeys('NAT2'), { NationalityCode: 'CN,DE' });
  });

  test('Nationality Risk uses the highest CountryRisk of all nationalities', async ({ rt }) => {
    const [high, low] = ['CN', 'DE'];
    expect(codeWeight('CountryRisk', high), 'test data: CN must outweigh DE').toBeGreaterThan(codeWeight('CountryRisk', low));

    const both = contribution(await sendCdd(rt, newKeys('NAT3'), { NationalityCode: `${high},${low}` }), 'Nationality Risk');
    const lowOnly = contribution(await sendCdd(rt, newKeys('NAT4'), { NationalityCode: low }), 'Nationality Risk');

    expect(both.score).toBeCloseTo(weighted('Nationality Risk', codeWeight('CountryRisk', high)), 2);
    expect(lowOnly.score).toBeCloseTo(weighted('Nationality Risk', codeWeight('CountryRisk', low)), 2);
    expect(both.dimension).toBe('Geography');
    expect.soft(both.info, 'score information names both nationalities').toMatch(/China|CN/);
    expect.soft(both.info, 'score information names both nationalities').toMatch(/Germany|DE/);
  });

  test('Nationality Risk uses every code, not only the first', async ({ rt }) => {
    // The highest code is never first, so scoring only nationality_code would fail.
    for (const [tag, codes] of [['NAT5', ['DE', 'CN']], ['NAT6', ['DE', 'CN', 'BE']]] as const) {
      expect(countryWeight(codes[0]), 'test data: first code is not the highest').toBeLessThan(highest(codes));
      const result = contribution(await sendCdd(rt, newKeys(tag), { NationalityCode: codes.join(',') }), NATIONALITY);

      expectNationalityScore(result, codes);
    }
  });

  test('a code with an org unit row in the list scores that row', async ({ rt }) => {
    // AT has a UQ_AUT row (0) beside its SHA row (30): the customer's org unit row wins.
    const codes = ['AT', 'CN'];
    expect(countryWeight('AT'), 'test data: UQ_AUT row for AT').toBe(codeWeight('CountryRisk', 'AT', ORG_UNIT));
    expect(countryWeight('AT'), 'test data: UQ_AUT row differs from SHA').not.toBe(codeWeight('CountryRisk', 'AT', 'SHA'));
    const result = contribution(await sendCdd(rt, newKeys('NAT7'), { NationalityCode: codes.join(',') }), NATIONALITY);

    expectNationalityScore(result, codes);
  });

  test('a list of 50 characters is accepted and every code is scored', async ({ rt }) => {
    expect(LONGEST.join(','), 'test data: list is exactly the 50-character limit').toHaveLength(NATIONALITY_LIST_LENGTH);
    const result = contribution(await sendCdd(rt, newKeys('NAT8'), { NationalityCode: LONGEST.join(',') }), NATIONALITY);

    expectNationalityScore(result, LONGEST);
  });

  test('a list longer than 50 characters is rejected', async ({ rt }) => {
    const codes = [...LONGEST, 'HU'];
    const result = await sendCddResponse(rt, newKeys('NAT9'), { NationalityCode: codes.join(',') });

    expect(result.error, `${codes.join(',').length} characters`).toMatch(new RegExp(`maxLength '${NATIONALITY_LIST_LENGTH}'`));
  });

  test('an unknown code anywhere in the list rejects the message', async ({ rt }) => {
    expect(infoLists.CountryRisk.some((row) => row.code === 'XX'), 'test data: XX is not a country code').toBe(false);
    for (const [tag, value] of [['NAT10', 'DE,XX'], ['NAT11', 'XX,DE']] as const) {
      const result = await sendCddResponse(rt, newKeys(tag), { NationalityCode: value });

      expect(result.error, value).toContain('Data integrity validation failed');
    }
  });

  test('a later message with another list rescores the customer', async ({ rt }) => {
    const keys = newKeys('NAT12');
    for (const codes of [['DE'], ['DE', 'CN'], ['DE']]) {
      const result = contribution(await sendCdd(rt, keys, { NationalityCode: codes.join(',') }), NATIONALITY);

      expectNationalityScore(result, codes);
    }
  });
});

function countryWeight(code: string): number {
  return codeWeight('CountryRisk', code);
}

function highest(codes: readonly string[]): number {
  return Math.max(...codes.map(countryWeight));
}

/** MAX of the per-code weights, and the score information lists every weight in the order sent. */
function expectNationalityScore(result: ScoreContribution, codes: readonly string[]): void {
  expect(result.score, codes.join(',')).toBeCloseTo(weighted(NATIONALITY, highest(codes)), 2);
  expect.soft(result.info, 'score information lists each weight').toContain(`(${codes.map(countryWeight).join(',')})`);
}
