import { defineConfig, devices } from '@playwright/test';
import { resolveOrigin, resolveHeadless } from './src/ui/browserManager';

const AUTH_FILE = '.auth/user.json';
// Logging in or out ends every session of that user server-side, so these specs run last (see `ends-session` below).
const ENDS_SESSION = /@ends-session/;
// Every UI worker shares one NetReveal user session (storageState), and the session holds the current
// entity: a second worker opening another screen can swap the customer under a running test
// ("Customer: null"). Keep each UI project on one worker; non-UI projects stay parallel.
const UI_WORKERS = 1;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: resolveOrigin(),
    ignoreHTTPSErrors: true,
    headless: resolveHeadless(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      // Teardown projects ignore file, --grep and --test-list filters, so the dashboard sets NAT_SKIP_ENDS_SESSION
      // when its selection holds no @ends-session test; otherwise every run would end with the login/logout specs.
      teardown: process.env.NAT_SKIP_ENDS_SESSION ? undefined : 'ends-session',
      metadata: { natRole: 'setup' },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      workers: UI_WORKERS,
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/\/ssh\//, /\/api\//, /\/batch\//],
      grepInvert: ENDS_SESSION,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
    {
      // Optional UI lanes — `npx playwright install firefox webkit` before first use.
      name: 'firefox',
      dependencies: ['setup'],
      workers: UI_WORKERS,
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/\/ssh\//, /\/api\//, /\/batch\//],
      grepInvert: ENDS_SESSION,
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
    },
    {
      name: 'webkit',
      dependencies: ['setup'],
      workers: UI_WORKERS,
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/\/ssh\//, /\/api\//, /\/batch\//],
      grepInvert: ENDS_SESSION,
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_FILE,
      },
    },
    {
      // Teardown of `setup`: runs once every UI project that uses the shared storageState has finished.
      name: 'ends-session',
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/\/ssh\//, /\/api\//, /\/batch\//],
      grep: ENDS_SESSION,
      metadata: { natRole: 'teardown' },
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
    {
      // Non-UI SSH — no auth.setup / storageState
      name: 'ssh',
      testMatch: /\/ssh\/.*\.spec\.ts/,
    },
    {
      // Non-UI REST (real-time messages) — no auth.setup / storageState
      name: 'api',
      testMatch: /\/api\/.*\.spec\.ts/,
    },
    {
      // Non-UI batch acquisition through MinIO, checked in the DB (Adminer) — no auth.setup / storageState.
      // Uploads use up an envelope date on the shared environment: such specs skip unless BATCH_ENABLED=true.
      name: 'batch',
      testMatch: /\/batch\/.*\.spec\.ts/,
    },
  ],
});
