import type { Essential } from '@/types';

/** Interval between reminders — uses `intervalSeconds` when set (e.g. test essentials), else minutes. */
export function getEssentialIntervalMs(e: Pick<Essential, 'intervalMinutes' | 'intervalSeconds'>): number {
  if (typeof e.intervalSeconds === 'number' && e.intervalSeconds > 0) {
    return e.intervalSeconds * 1000;
  }
  const m = e.intervalMinutes ?? 60;
  return m * 60_000;
}
