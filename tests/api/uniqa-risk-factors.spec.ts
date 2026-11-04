/**
 * @plan specs/uniqa-jira-80-96.md §8
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { contribution, newKeys, riskFactorRequests, sendCdd } from './uniqaCdd';

for (const customerType of ['personal', 'corporate'] as const) {
  test.describe(`Risk factor requests — ${customerType}`, () => {
    test.describe.configure({ timeout: 2 * 60_000 });

    for (const request of riskFactorRequests(customerType)) {
      const send = (rt: Parameters<typeof sendCdd>[0]) =>
        sendCdd(rt, newKeys(`${customerType[0].toUpperCase()}${request.id.slice(2)}`), request.fields, request.file);

      if (request.check === 'contributes') {
        test(`${request.id} ${request.factor} contributes`, async ({ rt }) => {
          test.fixme(!!request.pending, request.pending);
          const result = contribution(await send(rt), request.contributor!);

          expect(result.score, `${request.contributor} score`).toBeGreaterThan(0);
        });
      } else if (request.check === 'present') {
        // Plan 8.3: the request cannot score above 0 on QA; only that the contributor is returned.
        test(`${request.id} ${request.factor} is returned`, async ({ rt }) => {
          const result = contribution(await send(rt), request.contributor!);

          expect(result.score, `${request.contributor} score (${request.reason})`).toBeGreaterThanOrEqual(0);
        });
      } else {
        // No UNIQA contributor for this customer type, or the factor cannot be sent over REST (plan 8.2).
        test(`${request.id} ${request.factor} is accepted`, async ({ rt }) => {
          const result = await send(rt);

          expect(result.risk, 'CDDRisk in response').toBeTruthy();
        });
      }
    }
  });
}
