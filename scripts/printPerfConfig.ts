/* eslint-disable no-console */
/**
 * Resolved perf settings plus the checks that decide whether a load run will actually produce
 * measurements. Run it before a load run (and the perf workflow runs it on the runner), because
 * perf.users / perf.virtualUsers live in gitignored config/local.properties: a machine without
 * that file silently falls back to a single "admin" user.
 *
 *   npm run perf:config
 *
 * Warnings use the ::warning:: prefix so GitHub Actions surfaces them on the run summary.
 */
import { loadPerfConfig } from '../src/perf/perfConfig';

const cfg = loadPerfConfig();
const loadUsers = [...new Set(cfg.users)];
const row = (key: string, value: string) => console.log(`${key.padEnd(26)}: ${value}`);

console.log('=== Perf config ===');
row('application.environment', cfg.environment);
row('perf.release', cfg.release);
row('perf.virtualUsers', String(cfg.virtualUsers));
row(`perf.users (${cfg.users.length})`, cfg.users.join(', '));
row('load virtual users', String(loadUsers.length));
row('load journey', 'LOGIN -> random actions from own menu (some: All Alerts search + alert + Back) -> idle -> LOGOUT');
row('load login window (ms)', String(cfg.load.loginWindowMs));
row('load actions per user', `${cfg.load.actionsMin}-${cfg.load.actionsMax}`);
row('load All Alerts search %', String(cfg.load.allAlertsSearchPct));
row('load idle before logout', `${cfg.load.idleBeforeLogoutMinMs}-${cfg.load.idleBeforeLogoutMaxMs} ms`);
row('perf.baselineUser', cfg.baselineUser);
row('shard (PERF_SHARD)', `${cfg.shard.index}/${cfg.shard.total}`);
row('load.allowedEnvironments', cfg.load.allowedEnvironments.join(', ') || '(none)');
row('load.maxUsersElsewhere', String(cfg.load.maxUsersElsewhere));
row('baseline iterations', `${cfg.iterations} (+${cfg.warmupIterations} warmup)`);
row('baseline screens/iteration', cfg.screensPerIteration ? String(cfg.screensPerIteration) : 'all');
console.log('===================');

const warnings: string[] = [];

// Mirrors prepareLoadRun(): above this many users an environment must opt in, so that a shared
// QA/DEV environment is never loaded by accident (CLAUDE.md "Shared QA environments").
if (loadUsers.length > cfg.load.maxUsersElsewhere && !cfg.load.allowedEnvironments.includes(cfg.environment)) {
  warnings.push(
    `${loadUsers.length} virtual users on "${cfg.environment}" is above perf.load.maxUsersElsewhere=` +
      `${cfg.load.maxUsersElsewhere}, and "${cfg.environment}" is not in perf.load.allowedEnvironments ` +
      `(${cfg.load.allowedEnvironments.join(', ') || 'empty'}) - the load suite will SKIP and record nothing. ` +
      `Add "${cfg.environment}" to perf.load.allowedEnvironments to allow it.`,
  );
}

// Logins are dealt out disjointly per shard, so a shard with no login of its own cannot run.
if (loadUsers.length < cfg.shard.total) {
  warnings.push(
    `${loadUsers.length} login(s) cannot be split over ${cfg.shard.total} shards - every shard needs at ` +
      'least one of its own, or the same account would be logged in twice and NetReveal would end the ' +
      'earlier session. Add logins to perf.users, or use fewer shards.',
  );
}

if (cfg.users.length === 1 && cfg.users[0] === 'admin' && cfg.virtualUsers > 1) {
  warnings.push(
    'perf.users fell back to the single default "admin" - config/local.properties is gitignored, so on a ' +
      'fresh machine (CI runner) the real list must be supplied explicitly. The load suite will run ' +
      'only one user.',
  );
}

if (cfg.virtualUsers !== loadUsers.length) {
  warnings.push(
    `perf.virtualUsers=${cfg.virtualUsers} does not control the load suite: it runs exactly ` +
      `${loadUsers.length} distinct login(s) once each. Add distinct logins to perf.users for more users.`,
  );
}

if (cfg.shard.total > 1 && !cfg.coordinator && !cfg.startAt) {
  warnings.push('Sharded load without PERF_COORDINATOR or PERF_START_AT: shards start their login windows independently.');
}

warnings.forEach((w) => console.log(`::warning::${w}`));
