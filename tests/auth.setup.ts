import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Shared CommonJS POM / capabilities — same source as Cucumber UI steps
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NetRevealAuthCapability = require('../src/capabilities/netRevealAuthCapability');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveBaseUrl } = require('../src/ui/browserManager');

const AUTH_DIR = path.join(__dirname, '../.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'user.json');

/**
 * One-shot login → storageState for chromium project.
 * Credentials: userDataAdminUsername / userDataAdminPassword (config + ENV overlay).
 */
setup('authenticate as admin', async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });

  const auth = new NetRevealAuthCapability(page);
  await auth.openEnvironment();
  await auth.loginAs('admin');
  await auth.assertHomeHeaderAvailable();

  await page.context().storageState({ path: AUTH_FILE });
});
