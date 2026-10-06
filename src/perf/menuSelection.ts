import type { MenuScreen } from '../ui/pages/MainMenuPage';

export type ExcludedScreen = { path: string; reason: string };
export type MenuSelection = { open: MenuScreen[]; excluded: ExcludedScreen[] };

export type MenuFilter = {
  /** Only paths matching this are opened (null = all). */
  include: RegExp | null;
  /** Paths matching this are not opened (configurable extra exclusions). */
  exclude: RegExp | null;
  /** Opened by the All Alerts flow, so not opened twice. */
  handledElsewhere: string[];
};

/**
 * Never opened, whatever the configuration: links that run a global action on a plain click
 * (e.g. Services Manager → Reload Configuration → services/configuration/reload.do — CLAUDE.md
 * "Shared QA environments") or that change data just by opening (Get Next … assigns an alert).
 */
const GLOBAL_ACTION_LABEL = /\b(reload|re-?calculate|get next)\b/i;
const GLOBAL_ACTION_HREF = /reload|recalculate/i;

function normalise(path: string): string {
  return path
    .split('->')
    .map((p) => p.trim().toLowerCase())
    .join('->');
}

/** Which discovered screens a virtual user opens, and why the others are left out. */
export function selectScreens(screens: MenuScreen[], filter: MenuFilter): MenuSelection {
  const elsewhere = new Set(filter.handledElsewhere.map(normalise));
  const open: MenuScreen[] = [];
  const excluded: ExcludedScreen[] = [];

  const reasonFor = (s: MenuScreen): string | null => {
    const label = s.labels[s.labels.length - 1] || '';
    if (GLOBAL_ACTION_LABEL.test(label) || GLOBAL_ACTION_HREF.test(s.href)) return 'global action - never opened';
    if (!s.href) return 'no link';
    if (s.target && s.target !== '_self') return `opens in a new window (target=${s.target})`;
    if (!s.href.startsWith('/')) return 'not a NetReveal screen link';
    if (elsewhere.has(normalise(s.path))) return 'opened by the All Alerts flow';
    if (filter.exclude && filter.exclude.test(s.path)) return 'perf.menu.exclude';
    if (filter.include && !filter.include.test(s.path)) return 'not matched by perf.menu.include';
    return null;
  };

  screens.forEach((s) => {
    const reason = reasonFor(s);
    if (reason) excluded.push({ path: s.path, reason });
    else open.push(s);
  });
  return { open, excluded };
}
