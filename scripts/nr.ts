/**
 * Run any npm script against an environment alias (config/environments/<alias>.env).
 *
 *   npm run nr -- <alias>                         → print resolved config for that alias
 *   npm run nr -- <alias> <script> [args...]      → NR_ENV=<alias> npm run <script> -- [args...]
 *
 * Examples:
 *   npm run nr -- perf test:perf:screens
 *   npm run nr -- qa1 test:smoke
 *   npm run nr -- dev1 test:perf:screens --headed
 */
import { spawnSync } from 'child_process';
import { listEnvironmentAliases } from '../src/config/environments';

function main(): void {
  const [alias, script, ...args] = process.argv.slice(2);
  const known = listEnvironmentAliases();

  if (!alias) {
    // eslint-disable-next-line no-console
    console.error(`Usage: npm run nr -- <alias> [npm-script] [args...]\nAliases: ${known.join(', ') || '(none)'}`);
    process.exit(2);
  }
  if (!known.includes(alias)) {
    // eslint-disable-next-line no-console
    console.error(`Unknown alias "${alias}". Aliases: ${known.join(', ') || '(none — copy config/environments/example.env)'}`);
    process.exit(2);
  }

  const npmArgs = ['run', script || 'config:print', ...(args.length ? ['--', ...args] : [])];
  const result = spawnSync('npm', npmArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NR_ENV: alias },
  });
  process.exit(result.status ?? 1);
}

main();
