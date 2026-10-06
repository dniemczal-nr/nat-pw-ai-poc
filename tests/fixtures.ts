import { test as base, expect } from '@playwright/test';
import { NetRevealAuthCapability } from '../src/capabilities/netRevealAuthCapability';
import { AdminAuthCapability } from '../src/capabilities/adminAuthCapability';
import { SshClient } from '../src/capabilities/sshClient';
import { OracleDb } from '../src/capabilities/oracleDb';
import { PerfRecorder } from '../src/perf/perfRecorder';
import { loadPerfConfig, type PerfConfig } from '../src/perf/perfConfig';
import { ShellHeaderPage } from '../src/ui/pages/ShellHeaderPage';
import { HomePage } from '../src/ui/pages/HomePage';

type NatFixtures = {
  /** NetReveal auth flows (loginAs, logout, home header). Prefer storageState over re-login. */
  netRevealAuth: NetRevealAuthCapability;
  /** Admin login via LoginPage + shell header assert. */
  adminAuth: AdminAuthCapability;
  shellHeader: ShellHeaderPage;
  homePage: HomePage;
  /** Non-UI SSH capability (use from project `ssh` / tests/ssh). */
  ssh: SshClient;
  /** Resolved performance configuration for perf-only specs. */
  perfConfig: PerfConfig;
  /** Recorder for performance measurements and attachments. */
  perfRecorder: PerfRecorder;
  /** Oracle read-only connection for perf DB timing checks. */
  oracleDb: OracleDb;
};

/**
 * Seed and generated specs import `test` / `expect` from here — not raw `@playwright/test`.
 */
export const test = base.extend<NatFixtures>({
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
  perfConfig: async ({}, use) => {
    await use(loadPerfConfig());
  },
  perfRecorder: async ({}, use) => {
    await use(new PerfRecorder());
  },
  oracleDb: async ({}, use) => {
    await use(new OracleDb());
  },
});

export { expect };
