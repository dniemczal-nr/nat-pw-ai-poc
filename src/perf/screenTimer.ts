import type { Page, Request } from '@playwright/test';
import { NetRevealScreenError, type NetworkActivity, type ReadyResult } from '../ui/pages/NetRevealScreen';
import type { Measurement } from './types';

const TRACKED_RESOURCES = new Set(['document', 'xhr', 'fetch']);

export type TimerContext = {
  release: string;
  virtualUser: number;
  user: string;
};

export type NetworkSettings = {
  /** Quiet period confirming the requests a screen triggers have settled. */
  quietMs: number;
  /**
   * 0 = wait for every request (up to perf.readyTimeoutMs) — slow list queries are what we measure.
   * > 0 = a request still open after this long is treated as background traffic.
   */
  maxRequestWaitMs: number;
  /** Background requests (e.g. long-polling) that never count, by URL. */
  ignore: RegExp | null;
};

export type MeasureOptions = {
  screen: string;
  iteration: number;
  warmup: boolean;
};

type NetworkSample = { path: string; ttfbMs: number };

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0];
  }
}

/**
 * Times "user initiates action → screen ready for use" on one page and collects the
 * slowest server response in that window, so slow screens can be traced to the request
 * (and from there to the DB query) behind them.
 */
export class ScreenTimer {
  /**
   * @param onError called with a screenshot taken at the moment a step failed (the end-of-test
   *                screenshot only shows the page after logout)
   */
  constructor(
    private readonly page: Page,
    private readonly context: TimerContext,
    private readonly sink: (measurement: Measurement) => void,
    private readonly onError?: (measurement: Measurement, screenshot: Buffer | null) => void,
    private readonly network: NetworkSettings = { quietMs: 200, maxRequestWaitMs: 0, ignore: null },
  ) {}

  /**
   * @param action  the user action only (click/submit) — no waiting inside
   * @param ready   resolves when the screen is ready; gets the requests this action triggered
   *                (pass them to NetRevealScreen.waitUntilReady as `network`)
   */
  async measure(
    options: MeasureOptions,
    action: () => Promise<void>,
    ready: (network: NetworkActivity) => Promise<ReadyResult>,
  ): Promise<Measurement> {
    const samples: NetworkSample[] = [];
    const startedAt = Date.now();
    const inFlight = new Map<Request, number>();
    let lastActivity = startedAt;
    const ignore = this.network.ignore;

    const onRequest = (request: Request) => {
      if (!TRACKED_RESOURCES.has(request.resourceType())) return;
      if (ignore && ignore.test(request.url())) return;
      inFlight.set(request, Date.now());
      lastActivity = Date.now();
    };
    const onDone = (request: Request) => {
      if (!inFlight.delete(request)) return;
      lastActivity = Date.now();
    };
    const onFinished = (request: Request) => {
      onDone(request);
      if (!TRACKED_RESOURCES.has(request.resourceType())) return;
      const timing = request.timing();
      if (timing.startTime < startedAt || timing.responseStart < 0 || timing.requestStart < 0) return;
      samples.push({ path: pathOf(request.url()), ttfbMs: timing.responseStart - timing.requestStart });
    };
    const counted = () => {
      const max = this.network.maxRequestWaitMs;
      const cutoff = Date.now() - max;
      return [...inFlight.entries()].filter(([, started]) => max <= 0 || started >= cutoff);
    };
    const network: NetworkActivity = {
      pending: () => counted().length,
      pendingPaths: () => counted().map(([request]) => pathOf(request.url())),
      lastActivityAt: () => lastActivity,
      quietMs: this.network.quietMs,
    };

    this.page.on('request', onRequest);
    this.page.on('requestfinished', onFinished);
    this.page.on('requestfailed', onDone);
    let measurement: Measurement;
    try {
      await action();
      const result = await ready(network);
      measurement = this.build(options, startedAt, result.readyAt, samples, result.rows, '');
    } catch (err) {
      const endedAt = Date.now();
      const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
      measurement =
        err instanceof NetRevealScreenError
          ? // NR answered with an error page: the screen is not ready for testing — skipped, not failed.
            { ...this.build(options, startedAt, endedAt, samples, null, message), status: 'skipped', skipReason: 'nr-error' }
          : this.build(options, startedAt, endedAt, samples, null, `${message} @ ${pathOf(this.page.url())}`);
    } finally {
      this.page.off('request', onRequest);
      this.page.off('requestfinished', onFinished);
      this.page.off('requestfailed', onDone);
    }

    this.sink(measurement);
    if (measurement.status === 'error' && this.onError) {
      const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
      this.onError(measurement, screenshot);
    }
    return measurement;
  }

  /** Record a step that was not timed because the screen is not available to this user. */
  skip(options: MeasureOptions, reason: string): Measurement {
    const now = Date.now();
    const measurement: Measurement = {
      ...this.build(options, now, now, [], null, reason),
      status: 'skipped',
      skipReason: 'role',
    };
    this.sink(measurement);
    return measurement;
  }

  private build(
    options: MeasureOptions,
    startedAt: number,
    endedAt: number,
    samples: NetworkSample[],
    rows: number | null,
    error: string,
  ): Measurement {
    const slowest = samples.reduce<NetworkSample | null>(
      (worst, sample) => (!worst || sample.ttfbMs > worst.ttfbMs ? sample : worst),
      null,
    );
    return {
      release: this.context.release,
      screen: options.screen,
      virtualUser: this.context.virtualUser,
      user: this.context.user,
      iteration: options.iteration,
      warmup: options.warmup,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Math.round(endedAt - startedAt),
      serverMs: slowest ? Math.round(slowest.ttfbMs) : null,
      requests: samples.length,
      slowestRequest: slowest ? slowest.path : '',
      rows,
      status: error ? 'error' : 'ok',
      error,
    };
  }
}
