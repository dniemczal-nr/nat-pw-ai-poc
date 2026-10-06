import { test } from '../fixtures';
import { netRevealJourney } from '../../src/perf/netRevealJourney';
import { runVirtualUsers } from '../../src/perf/virtualUsers';
import { assertPerfRun, gherkinSteps } from './perfAssertions';

/**
 * @plan specs/perf-front-end.md §1
 * @seed tests/seed.spec.ts
 *
 * Screen response-time baseline: one user, no contention, so timings are the clean
 * per-screen numbers compared between releases. Logs in inside its own browser context on
 * purpose (LOGIN is one of the timed screens).
 */
test.describe('Screen response-time baseline', () => {
  test(
    'key screens are timed from user action to ready for a single user',
    { tag: ['@perf', '@perf-screens', '@SSSMP1VUIO-3176'] },
    async ({ browser, perfConfig, perfRecorder }) => {
      test.setTimeout(perfConfig.testTimeoutMs);

      const baseline = {
        ...perfConfig,
        users: [perfConfig.baselineUser],
        thinkTimeMs: perfConfig.baselineThinkTimeMs,
      };
      await runVirtualUsers(browser, baseline, perfRecorder, netRevealJourney, {
        virtualUsers: 1,
        step: gherkinSteps,
      });

      assertPerfRun(perfRecorder, baseline, true);
    },
  );
});
