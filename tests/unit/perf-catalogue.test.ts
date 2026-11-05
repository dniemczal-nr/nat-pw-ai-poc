import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Browser, Page, Locator } from '@playwright/test';
import { NetRevealAuthCapability, resolveLoginUsername } from '../../src/capabilities/netRevealAuthCapability';
import { AllAlertsPage } from '../../src/ui/pages/AllAlertsPage';
import { AlertDetailsPage } from '../../src/ui/pages/AlertDetailsPage';
import { MainMenuPage, type MenuScreen } from '../../src/ui/pages/MainMenuPage';
import { NetRevealScreen, NetRevealScreenError } from '../../src/ui/pages/NetRevealScreen';
import { netRevealJourney, runWithoutSteps, SCREEN, StepFailed } from '../../src/perf/netRevealJourney';
import { loadPerfConfig } from '../../src/perf/perfConfig';
import { PerfRecorder } from '../../src/perf/perfRecorder';
import { ScreenTimer } from '../../src/perf/screenTimer';
import { runVirtualUsers } from '../../src/perf/virtualUsers';
import { missingCatalogueScreens } from '../../src/perf/catalogueValidation';
import { distributedDelay, oneMonthEarlier, planActions } from '../../src/perf/loadSchedule';
import { createLoadCoordinator } from '../../src/perf/coordinator';

const ALL_ALERTS = 'Group Work->All Alerts';
const MENU_PATHS = [ALL_ALERTS, 'My Work->My Tasks->Daily View', 'My Work->Home', 'Reports->Alert Summary'];

const menuScreen = (path: string): MenuScreen => ({
  labels: path.split('->'), path, liId: path, ancestorIds: [], href: `/netreveal/${path.length}.do`, target: '',
});

type MockOptions = { locked?: boolean; empty?: boolean; noAllAlerts?: boolean; searchPct?: number; actions?: number };

function mockJourney(t: TestContext, options: MockOptions = {}) {
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
  const menu = MENU_PATHS.filter((path) => !(options.noAllAlerts && path === ALL_ALERTS)).map(menuScreen);
  t.mock.method(NetRevealAuthCapability.prototype, 'openEnvironment', async () => undefined);
  t.mock.method(NetRevealAuthCapability.prototype, 'loginAs', async () => { events.push('login'); });
  t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => { events.push('logout'); });
  t.mock.method(MainMenuPage.prototype, 'discoverScreens', async () => { events.push('discover'); return menu; });
  t.mock.method(MainMenuPage.prototype, 'revealScreen', async (s: MenuScreen) => { events.push(`reveal:${s.path}`); return locator; });
  t.mock.method(MainMenuPage.prototype, 'revealLeaf', async (path: string) => { events.push(`reveal:${path}`); return locator; });
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
  const base = loadPerfConfig();
  const cfg = {
    ...base,
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
      menuPath: ALL_ALERTS, view: '', criteria: [] as [string, string][],
      search: true, openAlertDetails: true,
    },
    load: {
      ...base.load,
      actionsMin: options.actions ?? 5,
      actionsMax: options.actions ?? 10,
      allAlertsSearchPct: options.searchPct ?? 100,
    },
    ready: { networkQuietMs: 0, maxRequestWaitMs: 0, ignoreRequests: null },
  };
  const recorder = new PerfRecorder();
  const timer = new ScreenTimer(page, { user: 'load-user', virtualUser: 290, release: 'unit' },
    recorder.add, undefined, { quietMs: 0, maxRequestWaitMs: 0, ignore: null });
  const actions = () => recorder.all().filter((m) => m.screen.startsWith('MENU '));
  return {
    cfg, events, recorder, actions,
    run: (singlePass = true) => netRevealJourney({
      page, cfg, user: 'load-user', virtualUser: 290, timer, step: runWithoutSteps, singlePass,
    }),
  };
}

test('load user reads its own menu and does a random 5-10 actions from it, without logging out', async (t) => {
  for (let run = 0; run < 20; run += 1) {
    const { run: go, events, actions, recorder } = mockJourney(t, { searchPct: 0 });
    await go();
    assert.deepEqual(events.slice(0, 3), ['environment', 'login', 'discover']);
    const opened = actions();
    assert.ok(opened.length >= 5 && opened.length <= 10, `${opened.length} actions`);
    const allowed = MENU_PATHS.filter((p) => p !== ALL_ALERTS).map(SCREEN.menu);
    assert.ok(opened.every((m) => allowed.includes(m.screen) && m.status === 'ok'));
    assert.ok(opened.every((m, i) => i === 0 || m.screen !== opened[i - 1].screen), 'no screen twice in a row');
    assert.ok(!events.includes('search') && !events.includes('logout'));
    assert.ok(recorder.all().every((m) => !m.warmup && m.iteration === 0));
  }
});

test('the All Alerts search is one of the actions, with Date From one month back and the first unlocked alert', async (t) => {
  const { run, events, recorder, actions, cfg } = mockJourney(t, { searchPct: 100, actions: 6 });
  await run();
  assert.equal(actions().length, 6);
  const at = events.indexOf(`reveal:${ALL_ALERTS}`);
  assert.deepEqual(events.slice(at, at + 5), [
    `reveal:${ALL_ALERTS}`, `criteria:${JSON.stringify([['Date From', oneMonthEarlier()]])}`,
    'search', 'open-alert:0', 'back',
  ]);
  assert.equal(events.filter((e) => e === 'search').length, 1);
  assert.deepEqual(missingCatalogueScreens([...recorder.all(), { ...recorder.all()[0], screen: SCREEN.logout }],
    ['load-user'], cfg.allAlerts.menuPath), []);
});

test('All Alerts search share follows perf.load.allAlertsSearchPct', async (t) => {
  let searched = 0;
  for (let run = 0; run < 200; run += 1) {
    const { run: go, events } = mockJourney(t, { searchPct: 30, actions: 5 });
    await go();
    if (events.includes('search')) searched += 1;
  }
  assert.ok(searched > 30 && searched < 90, `${searched}/200 searched`);
});

test('a user without All Alerts in its menu never searches but still does its actions', async (t) => {
  const { run, events, actions } = mockJourney(t, { noAllAlerts: true, searchPct: 100, actions: 7 });
  await run();
  assert.ok(!events.includes('search'));
  assert.equal(actions().length, 7);
});

test('Date From overrides only the configured start date', async (t) => {
  const { run, cfg, events } = mockJourney(t, { searchPct: 100 });
  cfg.allAlerts.criteria = [['Date From', '01/01/2020'], ['Status', 'New']];
  await run();
  assert.ok(events.includes(`criteria:${JSON.stringify([['Status', 'New'], ['Date From', oneMonthEarlier()]])}`));
  assert.deepEqual(cfg.allAlerts.criteria, [['Date From', '01/01/2020'], ['Status', 'New']]);
});

for (const options of [{ locked: true }, { empty: true }]) {
  test(`incomplete alert flow fails coverage but the remaining actions still run: ${JSON.stringify(options)}`, async (t) => {
    const { run, recorder, events, actions, cfg } = mockJourney(t, { ...options, searchPct: 100, actions: 8 });
    await run();
    assert.ok(!recorder.all().some((m) => m.screen === SCREEN.alertDetailsOpen && m.status === 'ok'));
    assert.equal(actions().length, 8);
    assert.equal(events.filter((e) => e === 'login').length, 1);
    assert.ok(!events.includes('logout'));
    assert.ok(missingCatalogueScreens(recorder.all(), ['load-user'], cfg.allAlerts.menuPath)
      .includes('load-user: ALERT_DETAILS_OPEN'));
  });
}

test('planActions: requested count, no back-to-back repeats, extra exactly once', () => {
  const screens = ['a', 'b', 'c'];
  for (let run = 0; run < 200; run += 1) {
    const plan = planActions(screens, 10, 'X');
    assert.equal(plan.length, 10);
    assert.equal(plan.filter((p) => p === 'X').length, 1);
    const withoutExtra = plan.filter((p) => p !== 'X');
    assert.ok(withoutExtra.every((p, i) => i === 0 || p !== withoutExtra[i - 1]));
    assert.ok(withoutExtra.slice(0, 3).sort().join() === 'a,b,c', 'menu exhausted before repeating');
  }
  assert.deepEqual(planActions([], 5, 'X'), ['X']);
  assert.deepEqual(planActions([], 5), []);
  assert.deepEqual(planActions(['a'], 3), ['a', 'a', 'a']);
});

test('calendar-month subtraction handles month ends, leap years and year boundaries', () => {
  for (const [year, month, day, expected] of [
    [2026, 11, 5, '05/10/2026'], [2026, 3, 31, '28/02/2026'],
    [2024, 3, 31, '29/02/2024'], [2026, 1, 31, '31/12/2025'],
  ] as const) {
    assert.equal(oneMonthEarlier(new Date(year, month - 1, day)), expected);
  }
});

test('randomized login slots cover the whole 120-second window', (t) => {
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

test('an ended load session fails recovery without a second login', async (t) => {
  const { run, recorder, events } = mockJourney(t);
  t.mock.method(MainMenuPage.prototype, 'isAvailable', async () => false);
  await assert.rejects(run(), /Session ended/);
  assert.equal(events.filter((e) => e === 'login').length, 1);
  assert.ok(recorder.errors().some((m) => /re-login is prohibited/.test(m.error)));
});

test('baseline preserves login retries, iterations and warmup', async (t) => {
  const { run, recorder, events } = mockJourney(t);
  let attempts = 0;
  t.mock.method(NetRevealAuthCapability.prototype, 'loginAs', async () => {
    if (++attempts < 5) throw new Error('Temporary failure');
  });
  await run(false);
  assert.equal(attempts, 5);
  assert.ok(!events.includes('discover'));
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

test('coverage: login, logout and one action for everybody; a started alert flow must finish', () => {
  const m = (screen: string, status: 'ok' | 'error' = 'ok') => ({
    release: 'unit', screen, virtualUser: 1, user: 'u', iteration: 0, warmup: false,
    startedAt: '', durationMs: 1, serverMs: null, requests: 0, slowestRequest: '', rows: null, status, error: '',
  });
  const screenOnly = [m(SCREEN.login), m(SCREEN.menu('My Work->Home')), m(SCREEN.logout)];
  assert.deepEqual(missingCatalogueScreens(screenOnly, ['u'], ALL_ALERTS), []);
  assert.deepEqual(missingCatalogueScreens([m(SCREEN.login), m(SCREEN.logout)], ['u'], ALL_ALERTS), ['u: any action']);
  assert.deepEqual(missingCatalogueScreens([m(SCREEN.login), m(SCREEN.menu('My Work->Home'))], ['u'], ALL_ALERTS), ['u: LOGOUT']);
  const alerts = [...screenOnly, m(SCREEN.menu(ALL_ALERTS)), m(SCREEN.allAlertsSearch),
    m(SCREEN.alertDetailsOpen), m(SCREEN.alertDetailsBack)];
  assert.deepEqual(missingCatalogueScreens(alerts, ['u'], ALL_ALERTS), []);
  for (const screen of [SCREEN.allAlertsSearch, SCREEN.alertDetailsOpen, SCREEN.alertDetailsBack]) {
    assert.deepEqual(missingCatalogueScreens(alerts.filter((x) => x.screen !== screen), ['u'], ALL_ALERTS), [`u: ${screen}`]);
  }
});

function mockBrowser(events: string[]) {
  const locator = {} as Locator;
  const page = {
    on: () => page, off: () => page, locator: () => locator,
    url: () => 'https://example.invalid', isClosed: () => false,
    screenshot: async () => Buffer.from('mock screenshot'),
  } as unknown as Page;
  return {
    newContext: async () => ({
      setDefaultTimeout: () => undefined, setDefaultNavigationTimeout: () => undefined,
      newPage: async () => page,
      close: async () => { events.push('close'); },
    }),
  } as unknown as Browser;
}

const loginOnly = async (ctx: Parameters<typeof netRevealJourney>[0]) => {
  await ctx.timer.measure({ screen: SCREEN.login, iteration: 0, warmup: false },
    async () => undefined, async () => ({ readyAt: Date.now(), rows: null }));
};

test('every user idles after its own actions and logs out on its own, without waiting for other shards', async (t) => {
  t.mock.method(console, 'log', () => undefined);
  const server = createLoadCoordinator(3, () => undefined);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const coordinator = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const users = Array.from({ length: 30 }, (_, i) => `user-${i}`);
  const events: string[] = [];
  const visits: string[] = [];
  t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => { events.push('logout'); });
  t.mock.method(NetRevealAuthCapability.prototype, 'assertOnLoginPage', async () => undefined);
  const recorders = Array.from({ length: 3 }, () => new PerfRecorder());
  await Promise.all(recorders.map((recorder, i) => runVirtualUsers(mockBrowser(events), {
    ...loadPerfConfig(), users, virtualUsers: users.length, shard: { index: i + 1, total: 3 },
    load: { ...loadPerfConfig().load, loginWindowMs: 0, idleBeforeLogoutMinMs: 20, idleBeforeLogoutMaxMs: 40 },
    coordinator, startAt: null,
    ready: { networkQuietMs: 0, maxRequestWaitMs: 0, ignoreRequests: null },
  }, recorder, async (ctx) => {
    assert.equal(ctx.singlePass, true);
    visits.push(ctx.user);
    await loginOnly(ctx);
    // Shard 3 works much longer than the idle time of shard 1.
    await new Promise((resolve) => setTimeout(resolve, i * 150));
    events.push(`finished-${i}`);
  }, { singlePass: true })));
  assert.deepEqual(visits.sort(), [...users].sort());
  assert.ok(events.indexOf('logout') < events.lastIndexOf('finished-2'), 'early finishers log out before slow ones finish');
  assert.equal(events.filter((e) => e === 'logout').length, 30);
  assert.equal(events.filter((e) => e === 'close').length, 30);
  const logouts = recorders.flatMap((r) => r.all()).filter((m) => m.screen === SCREEN.logout);
  assert.equal(logouts.length, 30);
  assert.ok(logouts.every((m) => m.status === 'ok'));
});

test('a user stays logged in for the configured idle time before logging out', async (t) => {
  t.mock.method(console, 'log', () => undefined);
  const events: string[] = [];
  let finishedAt = 0;
  let logoutAt = 0;
  t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => { logoutAt = Date.now(); });
  t.mock.method(NetRevealAuthCapability.prototype, 'assertOnLoginPage', async () => undefined);
  await runVirtualUsers(mockBrowser(events), {
    ...loadPerfConfig(), users: ['user-1'], virtualUsers: 1, shard: { index: 1, total: 1 },
    load: { ...loadPerfConfig().load, loginWindowMs: 0, idleBeforeLogoutMinMs: 200, idleBeforeLogoutMaxMs: 200 },
    coordinator: '', startAt: null,
  }, new PerfRecorder(), async (ctx) => {
    await loginOnly(ctx);
    finishedAt = Date.now();
  }, { singlePass: true });
  assert.ok(logoutAt - finishedAt >= 190, `idle ${logoutAt - finishedAt} ms`);
});

for (const failure of ['login', 'journey', 'logout'] as const) {
  test(`${failure} failure remains recorded and closes the context`, async (t) => {
    t.mock.method(console, 'log', () => undefined);
    const events: string[] = [];
    let logoutAttempts = 0;
    t.mock.method(NetRevealAuthCapability.prototype, 'logout', async () => {
      logoutAttempts += 1;
      if (failure === 'logout') throw new Error('Logout failed');
    });
    t.mock.method(NetRevealAuthCapability.prototype, 'assertOnLoginPage', async () => undefined);
    const recorder = new PerfRecorder();
    const run = runVirtualUsers(mockBrowser(events), {
      ...loadPerfConfig(), users: ['user-1'], virtualUsers: 1, shard: { index: 1, total: 1 },
      load: { ...loadPerfConfig().load, loginWindowMs: 0, idleBeforeLogoutMinMs: 0, idleBeforeLogoutMaxMs: 0 },
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
    assert.equal(events.filter((e) => e === 'close').length, 1);
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
