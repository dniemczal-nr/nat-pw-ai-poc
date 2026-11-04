import { test as base, expect } from '@playwright/test';
import { NetRevealAuthCapability } from '../src/capabilities/netRevealAuthCapability';
import { AdminAuthCapability } from '../src/capabilities/adminAuthCapability';
import { SshClient } from '../src/capabilities/sshClient';
import { RtRestClient } from '../src/capabilities/rtRestClient';
import { MinioClient } from '../src/capabilities/minioClient';
import { AdminerDbClient } from '../src/capabilities/adminerDbClient';
import { ShellHeaderPage } from '../src/ui/pages/ShellHeaderPage';
import { HomePage } from '../src/ui/pages/HomePage';
import { MainMenuPage } from '../src/ui/pages/MainMenuPage';
import { AllAlertsPage } from '../src/ui/pages/AllAlertsPage';
import { GroupWorkSiblingPage } from '../src/ui/pages/GroupWorkSiblingPage';
import { OrganizationalUnitsPage } from '../src/ui/pages/OrganizationalUnitsPage';
import { MyWorkListPage } from '../src/ui/pages/MyWorkListPage';
import { CustomerSearchPage } from '../src/ui/pages/CustomerSearchPage';
import { CustomerDetailsPage } from '../src/ui/pages/CustomerDetailsPage';

type NatFixtures = {
  /** NetReveal auth flows (loginAs, logout, home header). Prefer storageState over re-login. */
  netRevealAuth: NetRevealAuthCapability;
  /** Admin login via LoginPage + shell header assert. */
  adminAuth: AdminAuthCapability;
  shellHeader: ShellHeaderPage;
  homePage: HomePage;
  mainMenu: MainMenuPage;
  allAlerts: AllAlertsPage;
  groupWorkSibling: GroupWorkSiblingPage;
  organizationalUnits: OrganizationalUnitsPage;
  myWorkList: MyWorkListPage;
  customerSearch: CustomerSearchPage;
  customerDetails: CustomerDetailsPage;
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
  mainMenu: async ({ page }, use) => {
    await use(new MainMenuPage(page));
  },
  allAlerts: async ({ page }, use) => {
    await use(new AllAlertsPage(page));
  },
  groupWorkSibling: async ({ page }, use) => {
    await use(new GroupWorkSiblingPage(page));
  },
  organizationalUnits: async ({ page }, use) => {
    await use(new OrganizationalUnitsPage(page));
  },
  myWorkList: async ({ page }, use) => {
    await use(new MyWorkListPage(page));
  },
  customerSearch: async ({ page }, use) => {
    await use(new CustomerSearchPage(page));
  },
  customerDetails: async ({ page }, use) => {
    await use(new CustomerDetailsPage(page));
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
