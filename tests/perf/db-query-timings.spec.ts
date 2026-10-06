import path from 'path';
import { test, expect } from '../fixtures';
import { readSqlFile } from '../../src/capabilities/oracleDb';
import { loadPerfConfig } from '../../src/perf/perfConfig';

/**
 * @plan specs/perf-front-end.md §3
 * @seed tests/seed.spec.ts
 *
 * Times the SQL behind known slow screens directly (e.g. SSSMP1VUIO-2969 All Alerts list),
 * fetching only the first page of rows as the UI does. Read-only.
 */
const { db } = loadPerfConfig();

test.describe('Screen SQL execution time', () => {
  test.skip(db.timedQueries.length === 0, 'perf.db.timedQueries is empty');

  for (const file of db.timedQueries) {
    test(
      `query ${path.basename(file)} returns its first page within perf.db.maxQueryMs`,
      { tag: ['@perf', '@perf-db', '@SSSMP1VUIO-3176'] },
      async ({ oracleDb, perfConfig, perfRecorder }) => {
        test.skip(!oracleDb.isConfigured(), 'DbConnectionString / DbUsername / DbPassword not configured');
        const sql = readSqlFile(file);
        const durations: number[] = [];

        for (let iteration = 0; iteration < perfConfig.db.queryIterations; iteration += 1) {
          const startedAt = new Date().toISOString();
          const { durationMs, rows } = await oracleDb.timeQuery(sql, perfConfig.db.maxRows);
          durations.push(durationMs);
          perfRecorder.add({
            release: perfConfig.release,
            screen: `DB ${path.basename(file)}`,
            virtualUser: 0,
            user: 'jdbc',
            iteration,
            // First execution parses the statement and warms the buffer cache.
            warmup: iteration === 0 && perfConfig.db.queryIterations > 1,
            startedAt,
            durationMs,
            serverMs: durationMs,
            requests: 1,
            slowestRequest: file,
            rows,
            status: 'ok',
            error: '',
          });
        }

        const best = Math.min(...durations);
        test.info().annotations.push({ type: 'perf-db', description: `${file}: ${durations.join(' / ')} ms` });
        expect
          .soft(best, `fastest of ${durations.length} runs of ${file} (ms)`)
          .toBeLessThanOrEqual(perfConfig.db.maxQueryMs);
      },
    );
  }
});
