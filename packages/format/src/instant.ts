// Instants (ISO timestamps): shown in an explicit time zone, and measured against a "now" the
// caller passes in.

import { DAY_MS, HOUR_MS, MINUTE_MS } from "./duration.js";

/** The default zone wherever an instant is shown. */
export const KYIV_TIME_ZONE = "Europe/Kyiv";

/** Date and time of an instant: "24 лист. 2026 р., 14:05" in `uk`, "Nov 24, 2026, 2:05 PM" in `en`. */
export function formatDateTime(iso: string, locale: string, timeZone = KYIV_TIME_ZONE): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

/** The time of day of an instant: "14:05" in `uk`, "2:05 PM" in `en`. */
export function formatTime(iso: string, locale: string, timeZone = KYIV_TIME_ZONE): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(new Date(iso));
}

/** A whole number of the largest unit that fits. */
export interface Elapsed {
  value: number;
  unit: "minute" | "hour" | "day";
}

/**
 * How long ago `iso` was at `now` (milliseconds since the epoch), in the largest unit that fits:
 * minutes, hours or days, rounded down. An instant in the future counts as now.
 */
export function elapsedSince(iso: string, now: number): Elapsed {
  const elapsed = Math.max(now - new Date(iso).getTime(), 0);
  if (elapsed < HOUR_MS) return { value: Math.floor(elapsed / MINUTE_MS), unit: "minute" };
  if (elapsed < DAY_MS) return { value: Math.floor(elapsed / HOUR_MS), unit: "hour" };
  return { value: Math.floor(elapsed / DAY_MS), unit: "day" };
}

/** `elapsedSince` as a phrase in the locale's grammar: "3 hours ago", "3 години тому". */
export function formatElapsed(iso: string, now: number, locale: string): string {
  const { value, unit } = elapsedSince(iso, now);
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-value, unit);
}
