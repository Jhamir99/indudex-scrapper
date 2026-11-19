// The European Central Bank's euro reference rates: one small XML file each working day, used
// to compare pay in other currencies (pay FR-2, FR-3; legacy `builder/exchange-rates.mjs`). The
// scrapper keeps it in the store and the processor reads it there; both read it with this.

export const ECB_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

// Units of each currency for one euro; the euro itself is always 1.
export type Rates = Readonly<Record<string, number>>;

export interface EcbRates {
  // The day the rates are of, YYYY-MM-DD, or "" when the file names none.
  readonly day: string;
  readonly rates: Rates;
}

export function parseEcbRates(xml: string): EcbRates {
  const rates: Record<string, number> = { EUR: 1 };
  for (const match of xml.matchAll(
    /currency=['"]([A-Z]{3})['"]\s+rate=['"](\d+(?:\.\d+)?)['"]/g,
  ))
    rates[match[1] ?? ""] = Number(match[2]);
  const day = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1] ?? "";
  return { day, rates };
}

// Only the ECB's own file replaces the one kept: a notice page, a changed format or a cut download
// with a day in it would leave half a table, and pay in the missing currencies would go without a
// word (the legacy's DAA-14). The ECB lists some thirty.
const CURRENCIES_AT_LEAST = 25;
const ALWAYS_QUOTED = ["USD", "GBP", "CHF", "PLN", "SEK"];

export function isWhole({ day, rates }: EcbRates): boolean {
  return (
    day !== "" &&
    Object.keys(rates).length - 1 >= CURRENCIES_AT_LEAST &&
    ALWAYS_QUOTED.every((code) => (rates[code] ?? 0) > 0)
  );
}
