/**
 * @plan specs/uniqa-jira-80-96.md §1
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { codeWeight, contribution, newKeys, sendCdd, weighted } from './uniqaCdd';

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
});
