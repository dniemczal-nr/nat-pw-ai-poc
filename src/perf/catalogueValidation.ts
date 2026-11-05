import { SCREEN } from './netRevealJourney';
import type { Measurement } from './types';

/** The agreed load journey is mandatory for every account; no role-skip exemptions. */
export function missingCatalogueScreens(
  measurements: readonly Measurement[],
  users: readonly string[],
  allAlertsMenuPath: string,
  dailyViewMenuPath: string,
): string[] {
  return users.flatMap((user) => {
    const recorded = measurements.filter((m) => m.user === user);
    const required = [
      SCREEN.login, SCREEN.menu(allAlertsMenuPath), SCREEN.allAlertsSearch,
      SCREEN.alertDetailsOpen, SCREEN.alertDetailsBack, SCREEN.menu(dailyViewMenuPath), SCREEN.logout,
    ];
    return required
      .filter((screen) => !recorded.some((m) => m.screen === screen && m.status === 'ok'))
      .map((screen) => `${user}: ${screen}`);
  });
}
