/**
 * @plan specs/uniqa-jira-80-96.md §6
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { newKeys, riskModel, sendCdd } from './uniqaCdd';

// One org unit per distinct level set: HUN and POL share AUT's levels, HRV/MNE/SRB share BIH's.
const groups = new Map<string, string>();
for (const [orgUnit, model] of Object.entries(riskModel.orgUnits)) {
  const key = JSON.stringify(model.levels.map(({ level, low, high }) => [level, low, high]));
  if (!groups.has(key)) groups.set(key, orgUnit);
}

test.describe('Risk model per org unit', () => {
  test.describe.configure({ timeout: 10 * 60_000 });

  for (const orgUnit of groups.values()) {
    const { levels } = riskModel.orgUnits[orgUnit];

    test(`${orgUnit}: score just inside each level gets that level and EDD only on High`, async ({ rt }) => {
      // Score driven through OverallScoreAdjustment (Override, unweighted) on top of the baseline customer.
      const baseline = await sendCdd(rt, newKeys(`B${orgUnit.slice(3)}`), { OrgUnitCode: orgUnit });
      expect(baseline.score, 'baseline CDDRiskScore').toBeDefined();

      for (const level of levels) {
        // Lookup is low < score <= high; low + 1 also skips the F11 gap scores (UKR 21, BIH 41 …).
        for (const target of new Set([level.low + 1, level.high])) {
          const adjustment = (target - baseline.score!).toFixed(2);
          const result = await sendCdd(rt, newKeys(`${orgUnit.slice(3)}${target}`), {
            OrgUnitCode: orgUnit,
            OverallScoreAdjustment: adjustment,
          });
          expect.soft(result.score, `${orgUnit} score for adjustment ${adjustment}`).toBeCloseTo(target, 1);
          expect.soft(result.risk, `${orgUnit} score ${target}`).toBe(level.level);
          expect.soft(result.edd, `${orgUnit} score ${target}: EDD flag`).toBe(level.generateAlert);
        }
      }
    });
  }

  test('rescore across a level transition raises an alert per the transition matrix', async () => {
    test.fixme(true, 'CDD alerts are not in the OB response; needs the DbClient (§4) or a Customer Acceptance UI check.');
  });

  for (const [orgUnit, scores] of [
    ['UQ_UKR', [21, 61]],
    ['UQ_BIH', [41, 81]],
  ] as const) {
    test(`${orgUnit}: gap scores ${scores.join(' and ')} get the next level up`, async ({ rt }) => {
      test.fixme(true, 'Lookup low < score <= high leaves these scores without a level (finding F11).');
      const baseline = await sendCdd(rt, newKeys(`G${orgUnit.slice(3)}`), { OrgUnitCode: orgUnit });
      const { levels } = riskModel.orgUnits[orgUnit];
      for (const target of scores) {
        const result = await sendCdd(rt, newKeys(`${orgUnit.slice(3)}G${target}`), {
          OrgUnitCode: orgUnit,
          OverallScoreAdjustment: (target - baseline.score!).toFixed(2),
        });
        expect.soft(result.risk, `${orgUnit} score ${target}`).toBe(levels.find((l) => l.low === target)?.level);
      }
    });
  }
});
