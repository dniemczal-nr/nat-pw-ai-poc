import os from 'os';
import { test, expect } from '../fixtures';
import type { StepRunner } from '../../src/perf/netRevealJourney';
import type { PerfConfig } from '../../src/perf/perfConfig';
import type { PerfRecorder } from '../../src/perf/perfRecorder';

/** `test.step` as the journey's step runner, so Gherkin steps reach the console and HTML report. */
export const gherkinSteps: StepRunner = (title, body) => test.step(title, body);

/**
 * Before a load run:
 * - skip when more than perf.load.maxUsersElsewhere users would hit an environment not listed in
 *   perf.load.allowedEnvironments (shared QA/DEV must not be loaded — CLAUDE.md "Shared QA environments")
 * - annotate when free memory looks too small for the browser contexts, or users must share logins
 */
export function prepareLoadRun(cfg: PerfConfig): void {
  const allowed = cfg.load.allowedEnvironments;
  test.skip(
    cfg.virtualUsers > cfg.load.maxUsersElsewhere && !allowed.includes(cfg.environment),
    `${cfg.virtualUsers} virtual users on "${cfg.environment}" — load above ${cfg.load.maxUsersElsewhere} users ` +
      `is allowed only on: ${allowed.join(', ') || '(none)'} (perf.load.allowedEnvironments)`,
  );

  const onThisMachine = Math.ceil(cfg.virtualUsers / cfg.shard.total);
  const neededMb = onThisMachine * cfg.load.memoryPerUserMb;
  const freeMb = Math.round(os.freemem() / 1024 / 1024);
  if (neededMb > freeMb) {
    test.info().annotations.push({
      type: 'perf-warning',
      description:
        `${onThisMachine} virtual users on this machine need ~${neededMb} MB, ${freeMb} MB free — client-side ` +
        'slowness will inflate timings. Use more machines (PERF_SHARD) and merge (npm run perf:merge).',
    });
  }
  if (cfg.virtualUsers > cfg.users.length) {
    test.info().annotations.push({
      type: 'perf-warning',
      description:
        `${cfg.virtualUsers} virtual users share ${cfg.users.length} logins — NR may end an earlier session ` +
        'of the same user. Add logins to perf.users.',
    });
  }
}

/**
 * Shared end-of-run checks for perf specs:
 * - error rate within perf.maxErrorRatePct (or zero, when `requireNoErrors`)
 * - p90 per screen within perf.thresholds — fails only when perf.enforceThresholds=true,
 *   otherwise each breach is an annotation in the report (baseline phase).
 */
export function assertPerfRun(recorder: PerfRecorder, cfg: PerfConfig, requireNoErrors = false): void {
  const errors = recorder.errors().map((m) => `${m.screen} [vu ${m.virtualUser}, it ${m.iteration}]: ${m.error}`);

  expect(recorder.all().length, 'no measurements were recorded').toBeGreaterThan(0);
  // A failed login always fails the run, whatever perf.maxErrorRatePct allows.
  expect(
    recorder.errors().filter((m) => m.screen === 'LOGIN').map((m) => `[vu ${m.virtualUser}, ${m.user}]: ${m.error}`),
    'login failed',
  ).toEqual([]);
  if (requireNoErrors) {
    // Screens NR answers with an error page are reported, not failed (not ready for testing).
    const skipped = recorder
      .skipped()
      .filter((m) => m.skipReason !== 'nr-error')
      .map((m) => `${m.screen}: ${m.error}`);
    recorder
      .skipped()
      .filter((m) => m.skipReason === 'nr-error')
      .forEach((m) =>
        test.info().annotations.push({ type: 'perf-screen-not-ready', description: `${m.screen}: ${m.error}` }),
      );
    expect(errors, 'screens that did not become ready').toEqual([]);
    expect(skipped, `screens not available to "${cfg.users[0]}" (baseline user must see every screen)`).toEqual([]);
  } else {
    expect(
      recorder.errorRatePct(),
      `error rate above perf.maxErrorRatePct=${cfg.maxErrorRatePct}%:\n${errors.join('\n')}`,
    ).toBeLessThanOrEqual(cfg.maxErrorRatePct);
  }

  const breaches = recorder.thresholdBreaches(cfg.thresholds);
  breaches.forEach((b) =>
    test.info().annotations.push({
      type: 'perf-threshold',
      description: `${b.screen}: p90 ${b.p90Ms} ms > limit ${b.limitMs} ms`,
    }),
  );
  if (cfg.enforceThresholds) {
    expect(breaches, 'screens above perf.thresholds (p90)').toEqual([]);
  }
}
