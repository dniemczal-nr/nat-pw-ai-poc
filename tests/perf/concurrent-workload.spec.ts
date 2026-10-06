import { test } from '../fixtures';
import { diffSqlStats } from '../../src/capabilities/oracleDb';
import { netRevealJourney } from '../../src/perf/netRevealJourney';
import { runVirtualUsers } from '../../src/perf/virtualUsers';
import { assertPerfRun, gherkinSteps, prepareLoadRun } from './perfAssertions';

/**
 * @plan specs/perf-front-end.md §2
 * @seed tests/seed.spec.ts
 *
 * perf.virtualUsers concurrent users = headless browser contexts in ONE browser process,
 * round-robin over every login in perf.users. Each context logs in on its own (separate NR
 * session) — the documented exception to storageState reuse. Runs above
 * perf.load.maxUsersElsewhere users only on perf.load.allowedEnvironments (PERF).
 */
test.describe('Concurrent NAT workload', () => {
  test(
    'virtual users run the NetReveal journey concurrently',
    { tag: ['@perf', '@perf-load', '@SSSMP1VUIO-3176'] },
    async ({ browser, perfConfig, perfRecorder, oracleDb }) => {
      test.setTimeout(perfConfig.testTimeoutMs);
      prepareLoadRun(perfConfig);
      const captureTopSql = perfConfig.db.captureTopSql;
      test.skip(
        captureTopSql && !oracleDb.isConfigured(),
        'perf.db.captureTopSql=true needs DbConnectionString / DbUsername / DbPassword',
      );

      const before = captureTopSql ? await oracleDb.snapshotSqlStats() : [];
      const startedAt = new Date().toISOString();

      await runVirtualUsers(browser, perfConfig, perfRecorder, netRevealJourney, { step: gherkinSteps });

      // Exact run window, so the custom DB report can be generated for the same period.
      perfRecorder.setWindow({
        release: perfConfig.release,
        startedAt,
        endedAt: new Date().toISOString(),
        virtualUsers: perfConfig.virtualUsers,
        users: perfConfig.users,
      });
      if (captureTopSql) {
        const after = await oracleDb.snapshotSqlStats();
        perfRecorder.setTopSql(diffSqlStats(before, after, perfConfig.db.topSqlLimit));
      }

      assertPerfRun(perfRecorder, perfConfig);
    },
  );
});
