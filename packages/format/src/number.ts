// Numbers and money in the locale's notation.

/** How many digits follow the decimal separator. */
export interface FractionDigits {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/** A plain number: "1 234,5" in `uk`, "1,234.5" in `en`. Up to three decimals unless told otherwise. */
export function formatNumber(value: number, locale: string, digits: FractionDigits = {}): string {
  return new Intl.NumberFormat(locale, digits).format(value);
}

/** The supported currencies. */
export const CURRENCIES = ["UAH", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Formats an amount, in the formatter's own currency unless another is named. */
export type MoneyFormatter = (amount: number, currency?: Currency) => string;

/**
 * Returns a formatter for money in `locale`: "1 234,50 ₴", "$1,234.50", with the narrow currency
 * symbol and two decimals. The formatter keeps one Intl object per currency, so a table of a
 * thousand amounts builds three at most. A missing amount is the caller's to handle: this
 * formats numbers and never turns "unknown" into 0.
 */
export function createMoneyFormatter(
  locale: string,
  defaultCurrency: Currency = "UAH",
): MoneyFormatter {
  const formatters = new Map<Currency, Intl.NumberFormat>();
  return (amount, currency = defaultCurrency) => {
    let formatter = formatters.get(currency);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        // A float that rounds to zero, such as 100.1 - 100 - 0.1, shows no minus sign.
        signDisplay: "negative",
      });
      formatters.set(currency, formatter);
    }
    return formatter.format(amount);
  };
}
