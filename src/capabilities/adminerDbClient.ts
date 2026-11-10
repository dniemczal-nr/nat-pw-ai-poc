import type { Browser, BrowserContext, Page } from '@playwright/test';
import * as config from '../config';

export type DbRow = Record<string, string | null>;

function requireConfigValue(key: string): string {
  const value = config.get(key);
  if (!value || value.includes('${')) {
    throw new Error(
      `DB config error: missing or unresolved "${key}" (got: "${value}"). ` +
        'Set via config/local.properties or ENV (DB_ADMIN_URL, DB_NAME, DB_USER, DB_PASSWORD).',
    );
  }
  return value;
}

/** One SELECT (or WITH … SELECT), no second statement: the client never writes. */
export function assertReadOnly(sql: string): void {
  const statement = sql.trim().replace(/;\s*$/, '');
  if (!/^(select|with)\b/i.test(statement) || statement.includes(';')) {
    throw new Error(`AdminerDbClient runs a single SELECT only, got: ${sql.slice(0, 120)}`);
  }
  if (/\b(insert|update|delete|merge|alter|drop|truncate|create|grant|revoke|call|copy)\b/i.test(statement.replace(/'[^']*'/g, "''"))) {
    throw new Error(`AdminerDbClient refuses a statement with a write keyword: ${sql.slice(0, 120)}`);
  }
}

/**
 * Read-only database access through the environment's AdminerEvo web UI (the only DB route on
 * shared QA). Logs in once, then runs each SELECT on Adminer's SQL command page and reads the
 * result table. `NULL` cells come back as `null`.
 */
export class AdminerDbClient {
  private context: BrowserContext | undefined;
  private page: Page | undefined;
  private sqlUrl: string | undefined;

  constructor(private readonly browser: Browser) {}

  assertConfigured(): { url: string; driver: string; name: string; user: string; password: string } {
    return {
      url: requireConfigValue('dbAdmin.url'),
      driver: config.getOrDefault('dbAdmin.driver', 'pgsql'),
      name: requireConfigValue('dbAdmin.name'),
      user: requireConfigValue('dbAdmin.user'),
      password: requireConfigValue('dbAdmin.password'),
    };
  }

  async query(sql: string): Promise<DbRow[]> {
    assertReadOnly(sql);
    const page = await this.login();
    await page.goto(this.sqlUrl!, { waitUntil: 'domcontentloaded' });
    // The textarea sits under Adminer's syntax-highlighting layer, so it is filled directly.
    await page.locator('textarea[name=query]').evaluate((area, value) => {
      (area as HTMLTextAreaElement).value = value;
    }, sql);
    await Promise.all([
      page.waitForURL(() => true, { waitUntil: 'load' }),
      page.locator('input[type=submit][value=Execute]').click(),
    ]);
    const error = await page.locator('#content .error').allInnerTexts();
    if (error.length) throw new Error(`Adminer SQL error: ${error.join(' ')} — ${sql.slice(0, 200)}`);
    return page.locator('#content table').first().evaluate((table) => {
      const rows = [...table.querySelectorAll('tr')];
      const header = [...rows[0].children].map((cell) => (cell as HTMLElement).innerText.trim());
      return rows.slice(1).map((row) =>
        Object.fromEntries(
          [...row.children].map((cell, i) => {
            const text = (cell as HTMLElement).innerText.trim();
            const isNull = text === 'NULL' && cell.querySelector('i') !== null;
            return [header[i], isNull ? null : text];
          }),
        ),
      );
    });
  }

  async dispose(): Promise<void> {
    await this.context?.close();
    this.context = undefined;
    this.page = undefined;
  }

  private async login(): Promise<Page> {
    if (this.page) return this.page;
    const s = this.assertConfigured();
    this.context = await this.browser.newContext({ ignoreHTTPSErrors: true });
    const page = await this.context.newPage();
    await page.goto(s.url, { waitUntil: 'domcontentloaded' });
    await page.selectOption('[name="auth[driver]"]', s.driver);
    await page.fill('[name="auth[username]"]', s.user);
    await page.fill('[name="auth[password]"]', s.password);
    await page.fill('[name="auth[db]"]', s.name);
    await Promise.all([page.waitForURL(/[?&]username=/, { waitUntil: 'domcontentloaded' }), page.locator('input[type=submit]').first().click()]);
    const url = new URL(page.url());
    url.searchParams.set('sql', '');
    this.sqlUrl = url.toString();
    this.page = page;
    return page;
  }
}
