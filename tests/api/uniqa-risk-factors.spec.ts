/**
 * @plan specs/uniqa-jira-80-96.md §8
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { contribution, contributorFor, newKeys, qaProducts, riskFactorRequests, sendCdd } from './uniqaCdd';

// The collections' DEV product codes are not loaded on QA; Policy Types needs one on the PolicyTypeRisk list.
const fieldsFor = (factor: string): Record<string, string> =>
  factor === 'CustomerPolicyTypesRisk' ? { ProductSourceTypeCode: qaProducts.policyTypeRisk } : {};

for (const customerType of ['personal', 'corporate'] as const) {
  test.describe(`Risk factor requests — ${customerType}`, () => {
    test.describe.configure({ timeout: 2 * 60_000 });

    for (const request of riskFactorRequests(customerType)) {
      const contributor = contributorFor(request.factor);

      if (contributor) {
        test(`${request.id} ${request.factor} contributes`, async ({ rt }) => {
          const keys = newKeys(`${customerType[0].toUpperCase()}${request.id.slice(2)}`);
          const result = contribution(await sendCdd(rt, keys, fieldsFor(request.factor), request.file), contributor);

          expect(result.score, `${contributor} score`).toBeGreaterThan(0);
        });
      } else {
        // Not one of the 47 UNIQA contributors (detection spec §4.7): only acceptance is checked (plan 8.2).
        test(`${request.id} ${request.factor} is accepted`, async ({ rt }) => {
          const keys = newKeys(`${customerType[0].toUpperCase()}${request.id.slice(2)}`);
          const result = await sendCdd(rt, keys, fieldsFor(request.factor), request.file);

          expect(result.risk, 'CDDRisk in response').toBeTruthy();
        });
      }
    }
  });
}
