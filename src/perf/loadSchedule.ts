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
