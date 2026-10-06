import type { TestInfo } from '@playwright/test';
import type { MenuSelection } from './menuSelection';
import { PERF_ATTACHMENTS, type Measurement, type PerfWindow, type SqlStatDelta, type UserMenu } from './types';
import { percentile } from './stats';

export type ThresholdBreach = { screen: string; p90Ms: number; limitMs: number };

const MAX_ERROR_SCREENSHOTS = 10;

/**
 * Collects measurements for one test and hands them to the perf reporter as JSON
 * attachments (the reporter runs in the main process and aggregates across tests).
 */
export class PerfRecorder {
  private readonly measurements: Measurement[] = [];
  private readonly errorShots: { name: string; body: Buffer }[] = [];
  private readonly menus = new Map<string, UserMenu>();
  private topSql: SqlStatDelta[] = [];
  private window: PerfWindow | null = null;

  add = (measurement: Measurement): void => {
    this.measurements.push(measurement);
  };

  /** Menu read by a virtual user after login; one entry per login (same role → same menu). */
  addMenu = (user: string, selection: MenuSelection): void => {
    this.menus.set(user, {
      user,
      opened: selection.open.map((s) => s.path),
      excluded: selection.excluded,
    });
  };

  /** Screenshot taken when a step failed; the first few are attached to the report. */
  addErrorScreenshot = (measurement: Measurement, screenshot: Buffer | null): void => {
    if (!screenshot || this.errorShots.length >= MAX_ERROR_SCREENSHOTS) return;
    const name = `error vu${measurement.virtualUser} it${measurement.iteration} ${measurement.screen}`;
    this.errorShots.push({ name: name.replace(/[^\w .>-]+/g, '_'), body: screenshot });
  };

  all(): Measurement[] {
    return [...this.measurements];
  }

  /** Measurements that count towards statistics (no warm-up). */
  measured(): Measurement[] {
    return this.measurements.filter((m) => !m.warmup);
  }

  errors(): Measurement[] {
    return this.measurements.filter((m) => m.status === 'error');
  }

  skipped(): Measurement[] {
    return this.measurements.filter((m) => m.status === 'skipped');
  }

  /** Errors among attempted screens (screens not available to a role do not count). */
  errorRatePct(): number {
    const total = this.measurements.length - this.skipped().length;
    return total === 0 ? 0 : (this.errors().length / total) * 100;
  }

  /** p90 per screen above its configured limit. */
  thresholdBreaches(thresholds: Record<string, number>): ThresholdBreach[] {
    return Object.entries(thresholds).flatMap(([screen, limitMs]) => {
      const durations = this.measured()
        .filter((m) => m.screen === screen && m.status === 'ok')
        .map((m) => m.durationMs);
      if (!durations.length) return [];
      const p90Ms = percentile(durations, 90);
      return p90Ms > limitMs ? [{ screen, p90Ms, limitMs }] : [];
    });
  }

  setTopSql(rows: SqlStatDelta[]): void {
    this.topSql = rows;
  }

  setWindow(window: PerfWindow): void {
    this.window = window;
  }

  async attachTo(testInfo: TestInfo): Promise<void> {
    for (const shot of this.errorShots) {
      await testInfo.attach(shot.name, { body: shot.body, contentType: 'image/png' });
    }
    if (this.menus.size) {
      await testInfo.attach(PERF_ATTACHMENTS.menus, {
        body: JSON.stringify([...this.menus.values()]),
        contentType: 'application/json',
      });
    }
    if (this.measurements.length) {
      await testInfo.attach(PERF_ATTACHMENTS.measurements, {
        body: JSON.stringify(this.measurements),
        contentType: 'application/json',
      });
    }
    if (this.topSql.length) {
      await testInfo.attach(PERF_ATTACHMENTS.topSql, {
        body: JSON.stringify(this.topSql),
        contentType: 'application/json',
      });
    }
    if (this.window) {
      await testInfo.attach(PERF_ATTACHMENTS.window, {
        body: JSON.stringify(this.window),
        contentType: 'application/json',
      });
    }
  }
}
