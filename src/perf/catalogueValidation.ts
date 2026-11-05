import { SCREEN } from './netRevealJourney';
import type { Measurement } from './types';

const ACTION = /^(MENU |ALL_ALERTS_|ALERT_DETAILS_)/;

/**
 * Every account must log in, complete at least one of its random actions and log out; a user that
 * opened All Alerts must also finish the search, open the first unlocked alert and go Back.
 */
export function missingCatalogueScreens(
  measurements: readonly Measurement[],
  users: readonly string[],
  allAlertsMenuPath: string,
): string[] {
  return users.flatMap((user) => {
    const recorded = measurements.filter((m) => m.user === user);
    const ok = (screen: string) => recorded.some((m) => m.screen === screen && m.status === 'ok');
    const missing: string[] = [SCREEN.login, SCREEN.logout].filter((screen) => !ok(screen));
    if (!recorded.some((m) => ACTION.test(m.screen) && m.status === 'ok')) missing.push('any action');
    if (recorded.some((m) => m.screen === SCREEN.menu(allAlertsMenuPath))) {
      missing.push(...[SCREEN.menu(allAlertsMenuPath), SCREEN.allAlertsSearch, SCREEN.alertDetailsOpen,
        SCREEN.alertDetailsBack].filter((screen) => !ok(screen)));
    }
    return missing.map((screen) => `${user}: ${screen}`);
  });
}
