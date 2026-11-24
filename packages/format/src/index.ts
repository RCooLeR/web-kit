// @rcooler/format: durations, dates, numbers and money, written the same way in every app.
//
// Everything is a pure function of its arguments. Nothing reads the browser's time zone: an
// instant is shown in an explicit zone that defaults to Kyiv, and a calendar date is a
// YYYY-MM-DD string that is never moved across a zone boundary.

export { DAY_MS, HOUR_MS, MINUTE_MS, formatDuration } from "./duration.js";
export type { DurationUnits } from "./duration.js";
export {
  addDays,
  dateRange,
  formatCalendarDate,
  formatShortDate,
  weekdayIndex,
} from "./calendar.js";
export {
  KYIV_TIME_ZONE,
  elapsedSince,
  formatDateTime,
  formatElapsed,
  formatTime,
} from "./instant.js";
export type { Elapsed } from "./instant.js";
export { CURRENCIES, createMoneyFormatter, formatNumber } from "./number.js";
export type { Currency, FractionDigits, MoneyFormatter } from "./number.js";
