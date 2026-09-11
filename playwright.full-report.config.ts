import { defineConfig, devices } from '@playwright/test';
import { resolveOrigin, resolveHeadless } from './src/ui/browserManager';

const AUTH_FILE = '.auth/user.json';

/**
 * Serial full-suite config for UNIQA QA reporting.
 * workers=1 + JSON file reporter.
 *
 * My Work / Group Work run BEFORE menu smoke — long menu packs (~3–5 min)
 * can leave the shared admin session idle/stale so late worklist asserts fail
 * even though the same specs pass in isolation.
 *
 * Logout / fresh-login specs run via playwright.auth-smoke.config.ts AFTER this.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env.PLAYWRIGHT_JSON_OUTPUT || 'docs/test-reports/uniqa-full-results.json',
      },
    ],
    ['html', { open: 'never', outputFolder: 'playwright-report-full' }],
  ],
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
    },
    {
      name: 'chromium-worklists',
      dependencies: ['setup'],
      testMatch: [
        /seed\.spec\.ts/,
        /admin-shell-header\.spec\.ts/,
        /\/administration\//,
        /\/cross-cutting\//,
        /\/group-work\//,
        /\/my-work\//,
      ],
      testIgnore: [/\/ssh\//],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
    {
      name: 'chromium-menu',
      dependencies: ['chromium-worklists'],
      testMatch: [/\/menu\/.*\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
  ],
});
