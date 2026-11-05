import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Browser, Page, Locator } from '@playwright/test';
import { NetRevealAuthCapability, resolveLoginUsername } from '../../src/capabilities/netRevealAuthCapability';
import { AllAlertsPage } from '../../src/ui/pages/AllAlertsPage';
import { AlertDetailsPage } from '../../src/ui/pages/AlertDetailsPage';
import { MainMenuPage, MenuItemNotFoundError } from '../../src/ui/pages/MainMenuPage';
import { NetRevealScreen, NetRevealScreenError } from '../../src/ui/pages/NetRevealScreen';
import { netRevealJourney, runWithoutSteps, SCREEN, StepFailed } from '../../src/perf/netRevealJourney';
import { loadPerfConfig } from '../../src/perf/perfConfig';
import { PerfRecorder } from '../../src/perf/perfRecorder';
import { ScreenTimer } from '../../src/perf/screenTimer';
import { runVirtualUsers } from '../../src/perf/virtualUsers';
import { missingCatalogueScreens } from '../../src/perf/catalogueValidation';
import { distributedDelay, oneMonthEarlier } from '../../src/perf/loadSchedule';
import { createLoadCoordinator } from '../../src/perf/coordinator';

function mockJourney(t: TestContext, options: { locked?: boolean; empty?: boolean; noAllAlerts?: boolean } = {}) {
  const events: string[] = [];
  const locator: Locator = new Proxy({} as Locator, {
    get: (_target, property) => property === 'then' ? undefined : () => locator,
  });
  const page = {
    locator: () => locator,
    goto: async () => { events.push('environment'); },
    goBack: async () => undefined,
    on: () => page,
    off: () => page,
    url: () => 'https://example.invalid/netreveal/',
    isClosed: () => false,
  } as unknown as Page;
  t.mock.method(NetRevealAuthCapability.prototype, 'openEnvironment', async () => undefined);
  t.mock.method(NetRevealAuthCapability.prototype, 'loginAs', async () => { events.push('login'); });
  t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => { events.push('logout'); });
  t.mock.method(MainMenuPage.prototype, 'discoverScreens', async () => { throw new Error('Must not discover the menu'); });
  t.mock.method(MainMenuPage.prototype, 'revealLeaf', async (path: string) => {
    events.push(`reveal:${path}`);
    if (options.noAllAlerts && path === 'Group Work->All Alerts') {
      throw new MenuItemNotFoundError('All Alerts unavailable');
    }
    return locator;
  });
  t.mock.method(MainMenuPage.prototype, 'isAvailable', async () => true);
  t.mock.method(MainMenuPage.prototype, 'collapse', async () => undefined);
  t.mock.method(MainMenuPage.prototype, 'prepareLeafClick', async () => async () => undefined);
  t.mock.method(NetRevealScreen.prototype, 'markStale', async () => undefined);
  t.mock.method(NetRevealScreen.prototype, 'leaveWizard', async () => false);
  t.mock.method(NetRevealScreen.prototype, 'waitUntilReady', async () => ({
    readyAt: Date.now(), rows: options.empty ? 0 : 20,
  }));
  t.mock.method(AllAlertsPage.prototype, 'ensureSearchVisible', async () => undefined);
  t.mock.method(AllAlertsPage.prototype, 'fillWlmSearchCriteria', async (criteria: [string, string][]) => {
    events.push(`criteria:${JSON.stringify(criteria)}`);
  });
  t.mock.method(AllAlertsPage.prototype, 'clickSearch', async () => { events.push('search'); });
  t.mock.method(AllAlertsPage.prototype, 'alertCount', async () => options.empty ? 0 : 20);
  t.mock.method(AllAlertsPage.prototype, 'openAlert', async (row: number) => {
    events.push(`open-alert:${row}`);
    if (options.locked) throw new NetRevealScreenError('CFG-80017 - Alert locked');
  });
  t.mock.method(AlertDetailsPage.prototype, 'clickBack', async () => { events.push('back'); });
  const cfg = {
    ...loadPerfConfig(),
    virtualUsers: 290,
    screensAuto: false,
    screens: ['My Work->Home'],
    skipUnavailableScreens: false,
    iterations: 2,
    warmupIterations: 1,
    screensPerIteration: 0,
    thinkTimeMs: 0,
    thinkTimeMaxMs: 0,
    readyTimeoutMs: 60000,
    printSteps: false,
    allAlerts: {
      menuPath: 'Group Work->All Alerts', view: '', criteria: [] as [string, string][],
      search: true, openAlertDetails: true,
    },
    ready: { networkQuietMs: 0, maxRequestWaitMs: 0, ignoreRequests: null },
  };
  const recorder = new PerfRecorder();
  const timer = new ScreenTimer(page, { user: 'load-user', virtualUser: 290, release: 'unit' },
    recorder.add, undefined, { quietMs: 0, maxRequestWaitMs: 0, ignore: null });
  return {
    cfg, events, recorder,
    run: (singlePass = true) => netRevealJourney({
      page, cfg, user: 'load-user', virtualUser: 290, timer, step: runWithoutSteps, singlePass,
    }),
  };
}

test('load follows the agreed order once, opens the first unlocked row, and defers logout', async (t) => {
  const { run, recorder, events, cfg } = mockJourney(t);
  await run();
  assert.deepEqual(events, [
    'environment', 'login', 'reveal:Group Work->All Alerts',
    `criteria:${JSON.stringify([['Date From', oneMonthEarlier()]])}`,
    'search', 'open-alert:0', 'back', `reveal:${cfg.load.dailyViewMenuPath}`,
  ]);
  assert.deepEqual(recorder.all().map((m) => m.screen), [
    SCREEN.login, SCREEN.menu(cfg.allAlerts.menuPath), SCREEN.allAlertsSearch,
    SCREEN.alertDetailsOpen, SCREEN.alertDetailsBack, SCREEN.menu(cfg.load.dailyViewMenuPath),
  ]);
  assert.ok(recorder.all().every((m) => m.status === 'ok' && !m.warmup && m.iteration === 0));
});

test('Date From overrides only the configured start date', async (t) => {
  const { run, cfg, events } = mockJourney(t);
  cfg.allAlerts.criteria = [['Date From', '01/01/2020'], ['Status', 'New']];
  await run();
  assert.ok(events.includes(`criteria:${JSON.stringify([['Status', 'New'], ['Date From', oneMonthEarlier()]])}`));
  assert.deepEqual(cfg.allAlerts.criteria, [['Date From', '01/01/2020'], ['Status', 'New']]);
});

test('calendar-month subtraction handles month ends, leap years and year boundaries', () => {
  for (const [year, month, day, expected] of [
    [2026, 11, 5, '05/10/2026'], [2026, 3, 31, '28/02/2026'],
    [2024, 3, 31, '29/02/2024'], [2026, 1, 31, '31/12/2025'],
  ] as const) {
    assert.equal(oneMonthEarlier(new Date(year, month - 1, day)), expected);
  }
});

test('290 randomized login/logout slots stay distributed inside 120 seconds without a ramp', (t) => {
  for (const random of [0, 0.5, 0.999999]) {
    t.mock.method(Math, 'random', () => random);
    const delays = Array.from({ length: 290 }, (_, i) => distributedDelay(i, 290, 120000));
    assert.ok(delays.every((delay, i) => delay >= Math.floor(i * 120000 / 290) &&
      delay <= Math.ceil((i + 1) * 120000 / 290)));
    assert.ok(delays[0] < 414);
    assert.ok(delays[289] >= 119586 && delays[289] < 120000);
  }
});

test('a failed load login is attempted once, without starting UI work or logging out', async (t) => {
  const { run, recorder, events } = mockJourney(t);
  let attempts = 0;
  t.mock.method(NetRevealAuthCapability.prototype, 'loginAs', async () => {
    attempts += 1;
    throw new Error('Login unavailable');
  });
  await assert.rejects(run(), StepFailed);
  assert.equal(attempts, 1);
  assert.deepEqual(events, ['environment']);
  assert.match(recorder.errors()[0].error, /after 1 attempt/);
});

test('baseline preserves login retries, iterations and warmup', async (t) => {
  const { run, recorder, events } = mockJourney(t);
  let attempts = 0;
  t.mock.method(NetRevealAuthCapability.prototype, 'loginAs', async () => {
    if (++attempts < 5) throw new Error('Temporary failure');
  });
  await run(false);
  assert.equal(attempts, 5);
  const searches = recorder.all().filter((m) => m.screen === SCREEN.allAlertsSearch);
  assert.equal(searches.length, 3);
  assert.equal(searches.filter((m) => m.warmup).length, 1);
  assert.equal(events.at(-1), 'logout');
});

test('baseline stops after five failed logins and records one failure', async (t) => {
  const { run, recorder, events } = mockJourney(t);
  let attempts = 0;
  t.mock.method(NetRevealAuthCapability.prototype, 'loginAs', async () => {
    attempts += 1;
    throw new Error('Login unavailable');
  });
  await assert.rejects(run(false), StepFailed);
  assert.equal(attempts, 5);
  assert.equal(events.filter((e) => e === 'environment').length, 5);
  assert.equal(recorder.errors().length, 1);
  assert.match(recorder.errors()[0].error, /after 5 attempt/);
});

test('baseline retries navigation and readiness failures within the attempt budget', async (t) => {
  const { run, recorder } = mockJourney(t);
  let navigations = 0;
  let readiness = 0;
  t.mock.method(NetRevealAuthCapability.prototype, 'openEnvironment', async (timeoutMs?: number) => {
    assert.ok(timeoutMs && timeoutMs > 10000 && timeoutMs <= 30000);
    if (++navigations === 1) throw new Error('Environment unavailable');
  });
  const ready = NetRevealScreen.prototype.waitUntilReady;
  t.mock.method(NetRevealScreen.prototype, 'waitUntilReady', async function (
    this: NetRevealScreen, condition: Parameters<typeof ready>[0],
  ) {
    if (condition.timeoutMs <= 30000) {
      readiness += 1;
      if (readiness === 1) throw new Error('Home unavailable');
    }
    return ready.call(this, condition);
  });
  await run(false);
  assert.equal(navigations, 3);
  assert.equal(readiness, 2);
  assert.equal(recorder.errors().length, 0);
});

test('an ended load session fails recovery without a second login', async (t) => {
  const { run, recorder, events } = mockJourney(t);
  t.mock.method(MainMenuPage.prototype, 'isAvailable', async () => false);
  await assert.rejects(run(), /Session ended/);
  assert.equal(events.filter((e) => e === 'login').length, 1);
  assert.ok(recorder.errors().some((m) => /re-login is prohibited/.test(m.error)));
});

for (const options of [{ locked: true }, { empty: true }, { noAllAlerts: true }]) {
  test(`incomplete alert flow is a failure, still visits Daily View, and does not re-login: ${JSON.stringify(options)}`, async (t) => {
    const { run, recorder, events, cfg } = mockJourney(t, options);
    await run();
    assert.ok(!recorder.all().some((m) => m.screen === SCREEN.alertDetailsOpen && m.status === 'ok'));
    assert.ok(events.includes(`reveal:${cfg.load.dailyViewMenuPath}`));
    assert.equal(events.filter((e) => e === 'login').length, 1);
    assert.ok(!events.includes('logout'));
    assert.ok(missingCatalogueScreens(recorder.all(), ['load-user'], cfg.allAlerts.menuPath,
      cfg.load.dailyViewMenuPath).includes('load-user: ALERT_DETAILS_OPEN'));
  });
}

test('coverage requires every agreed action, including Back, Daily View and logout', async (t) => {
  const { run, recorder, cfg } = mockJourney(t);
  await run();
  const measurements = recorder.all();
  const logout = { ...measurements[0], screen: SCREEN.logout };
  const complete = [...measurements, logout];
  assert.deepEqual(missingCatalogueScreens(complete, ['load-user'], cfg.allAlerts.menuPath, cfg.load.dailyViewMenuPath), []);
  for (const measurement of complete) {
    assert.deepEqual(missingCatalogueScreens(complete.filter((m) => m !== measurement),
      ['load-user'], cfg.allAlerts.menuPath, cfg.load.dailyViewMenuPath), [`load-user: ${measurement.screen}`]);
  }
});

test('290 distinct accounts across shards retain sessions until all work finishes, then time logout', async (t) => {
  t.mock.method(console, 'log', () => undefined);
  const server = createLoadCoordinator(3, () => undefined);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const coordinator = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const users = Array.from({ length: 290 }, (_, i) => `user-${i}`);
  const visits: string[] = [];
  let finished = 0;
  let loggedOut = 0;
  let closed = 0;
  const locator = {} as Locator;
  const page = {
    on: () => page, off: () => page, locator: () => locator,
    url: () => 'https://example.invalid', isClosed: () => false,
  } as unknown as Page;
  const browser = {
    newContext: async () => ({
      setDefaultTimeout: () => undefined, setDefaultNavigationTimeout: () => undefined,
      newPage: async () => page,
      close: async () => {
        assert.equal(finished, 290, 'no early context close, even across shards');
        closed += 1;
      },
    }),
  } as unknown as Browser;
  t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => {
    assert.equal(finished, 290, 'no early logout, even across shards');
    loggedOut += 1;
  });
  t.mock.method(NetRevealAuthCapability.prototype, 'assertOnLoginPage', async () => undefined);
  const recorders = Array.from({ length: 3 }, () => new PerfRecorder());
  await Promise.all(recorders.map((recorder, i) => runVirtualUsers(browser, {
    ...loadPerfConfig(), users, virtualUsers: users.length, shard: { index: i + 1, total: 3 },
    load: { ...loadPerfConfig().load, loginWindowMs: 0, logoutWindowMs: 0 },
    coordinator, startAt: null,
    ready: { networkQuietMs: 0, maxRequestWaitMs: 0, ignoreRequests: null },
  }, recorder, async (ctx) => {
    assert.equal(ctx.singlePass, true);
    visits.push(ctx.user);
    await ctx.timer.measure({ screen: SCREEN.login, iteration: 0, warmup: false },
      async () => undefined, async () => ({ readyAt: Date.now(), rows: null }));
    await new Promise((resolve) => setTimeout(resolve, i * 5));
    finished += 1;
  }, { singlePass: true })));
  assert.deepEqual(visits.sort(), [...users].sort());
  assert.equal(loggedOut, 290);
  assert.equal(closed, 290);
  const logouts = recorders.flatMap((r) => r.all()).filter((m) => m.screen === SCREEN.logout);
  assert.equal(logouts.length, 290);
  assert.ok(logouts.every((m) => m.status === 'ok'));
});

test('multi-shard load without a completion coordinator is rejected before creating contexts', async () => {
  await assert.rejects(runVirtualUsers({} as Browser, {
    ...loadPerfConfig(), coordinator: '', shard: { index: 1, total: 2 },
  }, new PerfRecorder(), netRevealJourney, { singlePass: true }), /requires PERF_COORDINATOR/);
});

for (const failure of ['login', 'journey', 'logout'] as const) {
  test(`${failure} failure remains recorded and closes the retained context`, async (t) => {
    t.mock.method(console, 'log', () => undefined);
    let closed = 0;
    let logoutAttempts = 0;
    const locator = {} as Locator;
    const page = {
      on: () => page, off: () => page, locator: () => locator,
      url: () => 'https://example.invalid', isClosed: () => false,
      screenshot: async () => Buffer.from('mock screenshot'),
    } as unknown as Page;
    const browser = {
      newContext: async () => ({
        setDefaultTimeout: () => undefined, setDefaultNavigationTimeout: () => undefined,
        newPage: async () => page, close: async () => { closed += 1; },
      }),
    } as unknown as Browser;
    t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => {
      logoutAttempts += 1;
      if (failure === 'logout') throw new Error('Logout failed');
    });
    t.mock.method(NetRevealAuthCapability.prototype, 'assertOnLoginPage', async () => undefined);
    const recorder = new PerfRecorder();
    const run = runVirtualUsers(browser, {
      ...loadPerfConfig(), users: ['user-1'], virtualUsers: 1, shard: { index: 1, total: 1 },
      load: { ...loadPerfConfig().load, loginWindowMs: 0, logoutWindowMs: 0 },
      coordinator: '', startAt: null,
    }, recorder, async (ctx) => {
      const login = await ctx.timer.measure({ screen: SCREEN.login, iteration: 0, warmup: false },
        async () => { if (failure === 'login') throw new Error('Login failed'); },
        async () => ({ readyAt: Date.now(), rows: null }));
      if (login.status !== 'ok') throw new StepFailed('Login failed');
      if (failure === 'journey') throw new Error('Journey failed');
    }, { singlePass: true });
    if (failure === 'logout') await assert.rejects(run, /Load logout failed/);
    else await run;
    assert.equal(closed, 1);
    assert.equal(logoutAttempts, failure === 'login' ? 0 : 1);
    assert.ok(recorder.errors().some((m) =>
      m.screen === { login: SCREEN.login, journey: SCREEN.journeyAborted, logout: SCREEN.logout }[failure]));
  });
}

test('duplicate accounts cannot be passed to a single-pass runner', async () => {
  await assert.rejects(runVirtualUsers({} as Browser, {
    ...loadPerfConfig(), users: ['user-1', 'user-1'], virtualUsers: 2,
    shard: { index: 1, total: 1 }, coordinator: '',
  }, new PerfRecorder(), netRevealJourney, { singlePass: true }), /distinct perf.users/);
});

test('admin alias and login casing cannot create concurrent sessions of the same account', async () => {
  for (const users of [['user-1', 'USER-1'], ['admin', resolveLoginUsername('admin')]]) {
    await assert.rejects(runVirtualUsers({} as Browser, {
      ...loadPerfConfig(), users, virtualUsers: 2,
      shard: { index: 1, total: 1 }, coordinator: '',
    }, new PerfRecorder(), netRevealJourney, { singlePass: true }), /distinct/);
  }
});
