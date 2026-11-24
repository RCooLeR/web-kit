// Calendar dates as YYYY-MM-DD strings: a business date (a due date, a reading's day) that means
// the same day everywhere. They are moved around in UTC arithmetic and formatted in UTC, never
// through a local time zone, so no date shifts by a day on a machine east or west of the server.

function parts(date: string): [year: number, month: number, day: number] {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return [year, month, day];
}

function utc(date: string): Date {
  const [year, month, day] = parts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

/** The YYYY-MM-DD date `days` after (or, when negative, before) `date`. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = parts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, both included; empty when `to` is before `from`. */
export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** Weekday of a YYYY-MM-DD date with Monday as 0. */
export function weekdayIndex(date: string): number {
  return (utc(date).getUTCDay() + 6) % 7;
}

/** "22.11" or "11/22" by locale, for chart axes where the year is obvious. */
export function formatShortDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(utc(date));
}

/**
 * A calendar date in the locale's usual form: "01.06.2026" in `uk`, "6/1/2026" in `en`. Accepts a
 * date with a time part after it (an ISO timestamp from an API) and uses only the date. Text that
 * is not a real calendar date, such as "2026-02-31", is returned unchanged rather than silently
 * rolled over to another day.
 */
export function formatCalendarDate(date: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(date);
  if (!match) return date;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const value = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day;
  return isReal ? new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(value) : date;
}
