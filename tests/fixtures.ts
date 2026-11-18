import { test as base, expect } from '@playwright/test';
import { NetRevealAuthCapability } from '../src/capabilities/netRevealAuthCapability';
import { AdminAuthCapability } from '../src/capabilities/adminAuthCapability';
import { SshClient } from '../src/capabilities/sshClient';
import { RtRestClient } from '../src/capabilities/rtRestClient';
import { MinioClient } from '../src/capabilities/minioClient';
import { AdminerDbClient } from '../src/capabilities/adminerDbClient';
import { ShellHeaderPage } from '../src/ui/pages/ShellHeaderPage';
import { HomePage } from '../src/ui/pages/HomePage';

/** Annotation types that name the customers a test depends on (`recordCustomer`) and what it got back. */
const CUSTOMER_ANNOTATIONS = new Set(['customer', 'cdd']);

/**
 * Names a customer the current test depends on (created, sent or opened). On failure the test gets
 * a `customers` log attachment listing every recorded customer, so it can be looked up in the UI or DB.
 */
export function recordCustomer(customerId: string, detail?: string): void {
  const description = detail ? `${customerId} (${detail})` : customerId;
  const { annotations } = test.info();
  if (!annotations.some((a) => a.type === 'customer' && a.description === description)) {
    annotations.push({ type: 'customer', description });
  }
}

type NatFixtures = {
  /** Auto: attaches the `customers` log to a failed test that recorded customers. */
  customerLog: void;
  /** NetReveal auth flows (loginAs, logout, home header). Prefer storageState over re-login. */
  netRevealAuth: NetRevealAuthCapability;
  /** Admin login via LoginPage + shell header assert. */
  adminAuth: AdminAuthCapability;
  shellHeader: ShellHeaderPage;
  homePage: HomePage;
  /** Non-UI SSH capability (use from project `ssh` / tests/ssh). */
  ssh: SshClient;
};

type NatWorkerFixtures = {
  /** Real-time messages over REST (project `api` / tests/api). One token per worker. */
  rt: RtRestClient;
  /** MinIO batch data interface over S3, exact object keys (project `batch`). */
  minio: MinioClient;
  /** Read-only SQL through AdminerEvo: a single SELECT per call. One login per worker. */
  db: AdminerDbClient;
};

/**
 * Seed and generated specs import `test` / `expect` from here — not raw `@playwright/test`.
 */
export const test = base.extend<NatFixtures, NatWorkerFixtures>({
  customerLog: [
    async ({}, use, testInfo) => {
      await use();
      if (testInfo.status === testInfo.expectedStatus || testInfo.status === 'skipped') return;
      const lines = testInfo.annotations
        .filter((a) => CUSTOMER_ANNOTATIONS.has(a.type) && a.description)
        .map((a) => `${a.type.padEnd(8)} ${a.description}`);
      if (lines.length) {
        await testInfo.attach('customers', { body: `${lines.join('\n')}\n`, contentType: 'text/plain' });
      }
    },
    { auto: true },
  ],
  netRevealAuth: async ({ page }, use) => {
    await use(new NetRevealAuthCapability(page));
  },
  adminAuth: async ({ page }, use) => {
    await use(new AdminAuthCapability(page));
  },
  shellHeader: async ({ page }, use) => {
    await use(new ShellHeaderPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  ssh: async ({}, use) => {
    await use(new SshClient());
  },
  rt: [
    async ({ playwright }, use) => {
      const api = await playwright.request.newContext({ ignoreHTTPSErrors: true });
      await use(new RtRestClient(api));
      await api.dispose();
    },
    { scope: 'worker' },
  ],
  minio: [
    async ({ playwright }, use) => {
      const api = await playwright.request.newContext({ ignoreHTTPSErrors: true });
      await use(new MinioClient(api));
      await api.dispose();
    },
    { scope: 'worker' },
  ],
  db: [
    async ({ browser }, use) => {
      const db = new AdminerDbClient(browser);
      await use(db);
      await db.dispose();
    },
    { scope: 'worker' },
  ],
});

export { expect };
