/** Clamp month-end dates rather than overflowing into the current month. */
export function oneMonthEarlier(today = new Date()): string {
  const date = new Date(today.getFullYear(), today.getMonth(), 1);
  date.setMonth(date.getMonth() - 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(today.getDate(), lastDay));
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Stratified random arrivals span the window without adding a per-user ramp beyond it. */
export function distributedDelay(position: number, count: number, windowMs: number): number {
  return Math.floor(((position + Math.random()) / count) * windowMs);
}

/** Uniform random integer in [min, max]. */
export function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Fisher-Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * A user's random sequence of `count` actions: screens drawn from its own menu without repeats until the
 * menu is exhausted (then reshuffled, never the same screen twice in a row), plus `extra` - when given -
 * at a random position. A menu smaller than `count` repeats screens; an empty one yields only `extra`.
 */
export function planActions<T>(screens: readonly T[], count: number, extra?: T): T[] {
  const wanted = extra === undefined ? count : count - 1;
  const plan: T[] = [];
  let deck: T[] = [];
  while (screens.length && plan.length < wanted) {
    if (!deck.length) {
      deck = shuffle(screens);
      if (screens.length > 1 && deck[0] === plan[plan.length - 1]) deck.push(deck.shift() as T);
    }
    plan.push(deck.shift() as T);
  }
  if (extra !== undefined) plan.splice(Math.floor(Math.random() * (plan.length + 1)), 0, extra);
  return plan;
}
