import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

const STALE_ATTR = 'data-perf-stale';
const POLL_MS = 50;

/** Requests the screen itself triggered since the user action (fed by ScreenTimer). */
export type NetworkActivity = {
  /** document/XHR/fetch requests started after the action and not finished yet. */
  pending(): number;
  /** Paths of those requests (for the timeout message). */
  pendingPaths(): string[];
  /** Epoch ms of the latest request start or finish since the action. */
  lastActivityAt(): number;
  /** Network must stay quiet this long to count as settled (catches chained requests). */
  quietMs: number;
};

export type ReadyCondition = {
  /** Must be visible once the screen is ready. */
  target: Locator;
  /** The action replaces the document (menu click, link to another screen). */
  newDocument?: boolean;
  /** The action redraws this list in place (DataTables search / filter). */
  redrawnTable?: Locator;
  /** Extra screen-specific condition. */
  predicate?: () => Promise<boolean>;
  /** Also wait until the requests the action triggered have finished (list data, XHR). */
  network?: NetworkActivity;
  /**
   * The new document must be this screen: once it is loaded and shows a screen header but not
   * `target`, fail at once naming the screen we landed on (instead of waiting the full timeout).
   */
  expectScreen?: string;
  /**
   * describe() of the screen before the click: if the new document is the same screen again,
   * the click did not navigate (e.g. a workflow wizard holds the session) - fail, do not time it.
   */
  notSameAs?: string;
  timeoutMs: number;
};

export type ReadyResult = {
  /** Epoch ms when every condition held. */
  readyAt: number;
  /** Data rows in `redrawnTable`, when given. */
  rows: number | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** NetReveal error codes as shown in its error banner, e.g. "CFG-10011 - The requested screen does not exist". */
const NR_ERROR_TEXT = /\b[A-Z]{2,6}-\d{4,6}\s+-\s+\S/;

/** NetReveal rendered an error banner instead of the screen. */
export class NetRevealScreenError extends Error {}

/** Navigation tears down the execution context mid-check; the next poll retries. */
function isNavigationRace(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /Execution context was destroyed|navigation|Target closed|frame was detached/i.test(message);
}

/**
 * Shared NetReveal screen behaviour: busy indicators and the "ready for use" check
 * used by screen timings. Selectors migrated from NAT:
 * - CommonNetRevealPage.processingTable: //div[contains(@class,'dataTables_processing')]
 * - AllAlertsPage.processingTable: //div[contains(@id,'interactiveListTable_processing')]
 * - locators.properties XPATH_PROCESSING_BLOCK:
 *   //div[text()='Processing...'] | //div[@id != 'load' and @class='processing']
 * - AlertDetailsManualPage.PAGE_LOAD_OVERLAY: id=load
 * - CommonNetRevealPage.header (//h1) / alternativeHeader (id=content) / footer (id=screenId)
 */
export class NetRevealScreen extends BasePage {
  /** DataTables "Processing..." overlay, NR processing block, full-page load overlay. */
  readonly busyIndicators: Locator;
  /** Screen header — NAT CommonNetRevealPage: //h1, fallback id=content, footer id=screenId */
  readonly screenTitle: Locator;
  /**
   * NR error banner with an error code. Containers from NAT CommonNetRevealPage:
   * errorOrWarningMessage (div[contains(@class,'error')|'warning']) and notificationMessage (div.ab-notification).
   */
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.busyIndicators = page
      .locator(
        [
          'div.dataTables_processing',
          'div[id*="interactiveListTable_processing"]',
          'div:text-is("Processing...")',
          'div.processing:not(#load)',
          '#load',
        ].join(', '),
      )
      .filter({ visible: true });
    this.screenTitle = page.locator('h1, #content, #screenId').filter({ visible: true }).first();
    // NR 9 renders screen messages into div#messages right under the header (see home.do markup).
    this.errorBanner = page
      .locator('#messages div, #messages p, div[class*="error"], div[class*="warning"], div[class*="notification"]')
      .filter({ hasText: NR_ERROR_TEXT })
      .filter({ visible: true })
      .last();
  }

  /** "<title> (<screenId>)" of the current page, for diagnostics — NAT header //h1 and footer id=screenId. */
  async describe(): Promise<string> {
    const text = async (css: string) =>
      (await this.page.locator(css).first().innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
    const title = await text('h1');
    const screenId = await text('#screenId');
    const where = [title && `'${title}'`, screenId && `(${screenId})`].filter(Boolean).join(' ');
    return where || this.page.url().split('?')[0];
  }

  /**
   * NR workflow wizard ("Workflow step 1 of 2", e.g. Batch Processing / Business Area Processing):
   * it holds the session - every menu click reloads it - until the user presses Cancel.
   */
  async isInWizard(): Promise<boolean> {
    return (await this.page.getByText(/Workflow step \d+ of \d+/).filter({ visible: true }).count()) > 0;
  }

  /** Leave a workflow wizard through its Cancel button (untimed). Returns true when it did. */
  async leaveWizard(timeoutMs = 15000): Promise<boolean> {
    if (!(await this.isInWizard())) return false;
    const cancel = this.page
      .getByRole('button', { name: /^\s*Cancel\s*$/ })
      .or(this.page.locator('a, span, input[type="button"], input[type="submit"]').filter({ hasText: /^\s*Cancel\s*$/ }))
      .or(this.page.locator('input[type="button"][value="Cancel"], input[type="submit"][value="Cancel"]'))
      .filter({ visible: true })
      .first();
    if (!(await cancel.count())) throw new Error('in a workflow wizard but no Cancel button found');
    await this.markStale();
    await cancel.click({ timeout: 5000 });
    await this.waitUntilReady({ target: this.screenTitle, newDocument: true, timeoutMs });
    return true;
  }

  async isBusy(): Promise<boolean> {
    return (await this.busyIndicators.count()) > 0;
  }

  /**
   * Mark the current document (and optionally a list's rows) as stale right before a user
   * action, so readiness can tell the new screen/rows from the old ones without fixed waits.
   */
  async markStale(table?: Locator): Promise<void> {
    await this.page.evaluate((attr) => document.documentElement.setAttribute(attr, '1'), STALE_ATTR);
    if (table) {
      await table.evaluateAll((tables, attr) => {
        tables.forEach((t) => t.querySelectorAll('tbody tr').forEach((row) => row.setAttribute(attr, '1')));
      }, STALE_ATTR);
    }
  }

  /**
   * Poll until the screen is ready for use; returns the moment it became ready: the later of
   * "page conditions first held" and "last request the action triggered finished" (the quiet
   * period that confirms the network settled is not counted).
   */
  async waitUntilReady(condition: ReadyCondition): Promise<ReadyResult> {
    const deadline = Date.now() + condition.timeoutMs;
    const network = condition.network;
    let pageReadySince: number | null = null;
    let waitingFor = 'first check';

    while (Date.now() < deadline) {
      try {
        const result = await this.checkReady(condition, (reason) => {
          waitingFor = reason;
        });
        if (!result) {
          pageReadySince = null;
        } else {
          pageReadySince ??= result.readyAt;
          if (!network) return result;
          const quiet = Date.now() - network.lastActivityAt();
          waitingFor = 'requests the action triggered to finish';
          if (network.pending() === 0 && quiet >= network.quietMs) {
            return { readyAt: Math.max(pageReadySince, network.lastActivityAt()), rows: result.rows };
          }
        }
      } catch (err) {
        if (!isNavigationRace(err)) throw err;
        waitingFor = 'the new page (navigation in progress)';
      }
      await sleep(POLL_MS);
    }

    // A request that never finishes is the usual cause — name it (add it to perf.ready.ignoreRequests
    // if it is background traffic such as long-polling).
    const running = network ? network.pendingPaths() : [];
    const suffix = running.length
      ? `still running: ${running.slice(0, 3).join(', ')}`
      : `waiting for ${waitingFor}`;
    const on = await this.describe().catch(() => '');
    throw new Error(`Screen not ready within ${condition.timeoutMs} ms (${suffix})${on ? ` - on ${on}` : ''}`);
  }

  private async checkReady(
    condition: ReadyCondition,
    waiting: (reason: string) => void,
  ): Promise<ReadyResult | null> {
    if (condition.newDocument) {
      // New document, fully loaded (load event fired - the point where Selenium's click returns).
      const state = await this.page.evaluate(
        (attr) => ({ stale: document.documentElement.hasAttribute(attr), readyState: document.readyState }),
        STALE_ATTR,
      );
      if (state.stale) {
        waiting('the new page (old document still shown)');
        return null;
      }
      // An NR error page is final — no point waiting for the screen's title.
      if (await this.errorBanner.count()) {
        const text = (await this.errorBanner.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        throw new NetRevealScreenError(text || 'NetReveal error banner');
      }
      if (state.readyState !== 'complete') {
        waiting(`load event (document.readyState=${state.readyState})`);
        return null;
      }
    }

    let rows: number | null = null;
    if (condition.redrawnTable) {
      const state = await condition.redrawnTable.evaluateAll((tables, attr) => {
        const bodyRows = tables.flatMap((t) => Array.from(t.querySelectorAll('tbody tr')));
        return {
          redrawn: bodyRows.length > 0 && bodyRows.every((row) => !row.hasAttribute(attr)),
          dataRows: bodyRows.filter(
            (row) => !row.querySelector('td.dataTables_empty') && !/No records found/i.test(row.textContent || ''),
          ).length,
        };
      }, STALE_ATTR);
      if (!state.redrawn) {
        waiting('the result list to be redrawn');
        return null;
      }
      rows = state.dataRows;
    }

    if (!(await condition.target.first().isVisible())) {
      // Loaded a different screen than the one asked for (e.g. NR resumed a workflow wizard).
      if (condition.newDocument && condition.expectScreen && (await this.screenTitle.isVisible()) && !(await this.isBusy())) {
        throw new Error(`landed on ${await this.describe()} instead of ${condition.expectScreen}`);
      }
      // Banner in a container class we do not know: the page has no screen element but NR error text.
      const errorText = this.page.getByText(NR_ERROR_TEXT).filter({ visible: true }).first();
      if (condition.newDocument && (await errorText.count())) {
        throw new NetRevealScreenError((await errorText.innerText().catch(() => '')).replace(/\s+/g, ' ').trim());
      }
      waiting('the screen element to be visible (h1 / #content / #screenId or the screen-specific one)');
      return null;
    }
    if (await this.isBusy()) {
      waiting('the NR loading indicator to disappear');
      return null;
    }
    if (condition.predicate && !(await condition.predicate())) {
      waiting('the screen-specific condition');
      return null;
    }
    if (condition.newDocument && condition.notSameAs) {
      const now = await this.describe();
      if (now === condition.notSameAs) {
        throw new Error(`stayed on ${now} - the menu click reloaded the current screen instead of opening the new one`);
      }
    }

    return { readyAt: Date.now(), rows };
  }
}
