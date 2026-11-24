// Durations in milliseconds, shown as hours and minutes.

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** The unit words of the user's language, from the app's dictionary: "h" and "min", "год" and "хв". */
export interface DurationUnits {
  hours: string;
  minutes: string;
}

/**
 * "1 h 05 min", "12 min", "0 min". Rounds down, so time that has not passed yet is never shown as
 * passed. A negative duration counts as zero.
 */
export function formatDuration(ms: number, units: DurationUnits): string {
  const totalMinutes = Math.floor(Math.max(ms, 0) / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} ${units.minutes}`;
  return `${hours} ${units.hours} ${String(minutes).padStart(2, "0")} ${units.minutes}`;
}
