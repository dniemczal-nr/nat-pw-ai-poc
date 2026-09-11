import { defineConfig, devices } from '@playwright/test';
import { resolveOrigin, resolveHeadless } from './src/ui/browserManager';

/** Auth smokes that invalidate server session — run AFTER main suite. */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT || 'docs/test-reports/uniqa-auth-smoke-results.json' }],
  ],
  use: {
    baseURL: resolveOrigin(),
    ignoreHTTPSErrors: true,
    headless: resolveHeadless(),
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium-auth-smoke',
      dependencies: ['setup'],
      testMatch: [/admin-login\.spec\.ts/, /admin-logout\.spec\.ts/, /check-login\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
    },
  ],
});
