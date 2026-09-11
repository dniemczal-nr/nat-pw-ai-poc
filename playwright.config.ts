import { defineConfig, devices } from '@playwright/test';
import { resolveOrigin, resolveHeadless } from './src/ui/browserManager';

const AUTH_FILE = '.auth/user.json';

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
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/\/ssh\//],
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
  ],
});
