import { describe, expect, it } from "vitest";

import {
  HOUR_MS,
  MINUTE_MS,
  addDays,
  createMoneyFormatter,
  dateRange,
  elapsedSince,
  formatCalendarDate,
  formatDateTime,
  formatDuration,
  formatElapsed,
  formatNumber,
  formatShortDate,
  formatTime,
  weekdayIndex,
} from "./index.js";

/** Intl separates groups and currency signs with non-breaking spaces; the tests compare plain ones. */
const plain = (text: string) => text.replace(/\s/g, " ");

const units = { hours: "h", minutes: "min" };

describe("formatDuration", () => {
  it("shows minutes alone under an hour", () => {
    expect(formatDuration(12 * MINUTE_MS, units)).toBe("12 min");
    expect(formatDuration(0, units)).toBe("0 min");
  });

  it("pads minutes after hours", () => {
    expect(formatDuration(HOUR_MS + 5 * MINUTE_MS, units)).toBe("1 h 05 min");
    expect(formatDuration(26 * HOUR_MS, units)).toBe("26 h 00 min");
  });

  it("rounds down and never goes negative", () => {
    expect(formatDuration(59_999, units)).toBe("0 min");
    expect(formatDuration(-5000, units)).toBe("0 min");
  });

  it("uses the unit words it is given", () => {
    expect(formatDuration(HOUR_MS + MINUTE_MS, { hours: "год", minutes: "хв" })).toBe(
      "1 год 01 хв",
    );
  });
});

describe("calendar dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("lists a range including both ends", () => {
    expect(dateRange("2026-11-29", "2026-12-01")).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
    ]);
    expect(dateRange("2026-11-22", "2026-11-22")).toEqual(["2026-11-22"]);
    expect(dateRange("2026-11-22", "2026-11-21")).toEqual([]);
  });

  it("numbers weekdays from Monday", () => {
    expect(weekdayIndex("2026-11-23")).toBe(0); // Monday
    expect(weekdayIndex("2026-11-22")).toBe(6); // Sunday
  });

  it("writes a short date in the locale's order", () => {
    expect(formatShortDate("2026-11-22", "uk")).toBe("22.11");
    expect(formatShortDate("2026-11-22", "en")).toBe("11/22");
  });

  it("writes a full date without moving it across a time zone", () => {
    // The test process runs west of UTC (vitest.config.ts): a date parsed as local midnight
    // would come out as the day before.
    expect(formatCalendarDate("2026-06-01", "uk")).toBe("01.06.2026");
    expect(formatCalendarDate("2026-06-01", "en")).toBe("6/1/2026");
    expect(formatCalendarDate("2026-06-01T00:00:00Z", "uk")).toBe("01.06.2026");
    expect(formatCalendarDate("2026-06-01 23:59:59", "uk")).toBe("01.06.2026");
  });

  it("returns text that is not a real date unchanged", () => {
    expect(formatCalendarDate("2026-02-31", "uk")).toBe("2026-02-31");
    expect(formatCalendarDate("soon", "uk")).toBe("soon");
    expect(formatCalendarDate("", "uk")).toBe("");
  });
});

describe("instants", () => {
  // 12:05 UTC is 14:05 in Kyiv in winter (UTC+2) and 15:05 in summer (UTC+3).
  const winter = "2026-11-24T12:05:00Z";
  const summer = "2026-07-01T12:05:00Z";

  it("shows the time in Kyiv by default, whatever zone the machine is in", () => {
    expect(formatTime(winter, "uk")).toBe("14:05");
    expect(formatTime(summer, "uk")).toBe("15:05");
    expect(plain(formatTime(winter, "en"))).toBe("2:05 PM");
  });

  it("shows the time in another zone when asked", () => {
    expect(formatTime(winter, "uk", "UTC")).toBe("12:05");
    expect(formatTime(winter, "uk", "Europe/Warsaw")).toBe("13:05");
  });

  it("puts an instant near midnight on the Kyiv day", () => {
    // 23:30 UTC on the 24th is already the 25th in Kyiv.
    expect(plain(formatDateTime("2026-11-24T23:30:00Z", "en"))).toBe("Nov 25, 2026, 1:30 AM");
    expect(plain(formatDateTime("2026-11-24T23:30:00Z", "uk"))).toContain("25 лист. 2026");
    expect(plain(formatDateTime("2026-11-24T23:30:00Z", "uk"))).toContain("01:30");
  });
});

describe("elapsed time", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");

  it("picks the largest unit that fits", () => {
    expect(elapsedSince("2026-11-22T11:58:30Z", now)).toEqual({ value: 1, unit: "minute" });
    expect(elapsedSince("2026-11-22T09:00:00Z", now)).toEqual({ value: 3, unit: "hour" });
    expect(elapsedSince("2026-11-19T12:00:00Z", now)).toEqual({ value: 3, unit: "day" });
  });

  it("treats a time in the future as now", () => {
    expect(elapsedSince("2026-11-22T12:05:00Z", now)).toEqual({ value: 0, unit: "minute" });
  });

  it("writes the phrase in the locale's grammar", () => {
    expect(formatElapsed("2026-11-22T09:00:00Z", now, "en")).toBe("3 hours ago");
    expect(formatElapsed("2026-11-22T11:59:00Z", now, "en")).toBe("1 minute ago");
    expect(formatElapsed("2026-11-22T09:00:00Z", now, "uk")).toBe("3 години тому");
    expect(formatElapsed("2026-11-17T12:00:00Z", now, "uk")).toBe("5 днів тому");
  });
});

describe("numbers and money", () => {
  it("groups and separates in the locale's notation", () => {
    expect(plain(formatNumber(1234.5, "uk"))).toBe("1 234,5");
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
  });

  it("keeps the asked number of decimals", () => {
    expect(formatNumber(1.4, "en", { minimumFractionDigits: 2 })).toBe("1.40");
    expect(formatNumber(0.12345, "uk", { maximumFractionDigits: 4 })).toBe("0,1235");
  });

  it("formats hryvnia by default, with two decimals", () => {
    const money = createMoneyFormatter("uk");
    expect(plain(money(1234.5))).toBe("1 234,50 ₴");
    expect(plain(money(0))).toBe("0,00 ₴");
    expect(plain(money(-15.005))).toMatch(/^-15,0[01] ₴$/);
  });

  it("formats another currency when one is named", () => {
    const money = createMoneyFormatter("uk");
    expect(plain(money(10, "USD"))).toBe("10,00 $");
    expect(plain(money(10, "EUR"))).toBe("10,00 €");

    const dollars = createMoneyFormatter("en", "USD");
    expect(dollars(0.1234)).toBe("$0.12");
    expect(dollars(1234.5)).toBe("$1,234.50");
    expect(dollars(10, "UAH")).toBe("₴10.00");
  });
});
