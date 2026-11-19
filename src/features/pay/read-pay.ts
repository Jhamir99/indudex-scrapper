import type { Rates } from "../../shared/rates/ecb.js";
import { cleanCurrency, currencyOf, NO_CURRENCY } from "./currencies.js";
import { fieldOf } from "./figures.js";
import { periodByLaw, yearCalledMonth } from "./minimum-wages.js";
import { PER_YEAR, type PayPeriod, periodOf } from "./periods.js";

// A pay as given, before it is checked: a source's pay field, or the figures read from its text.
export interface PayGiven {
  readonly min?: unknown;
  readonly max?: unknown;
  readonly currency?: unknown;
  readonly period?: unknown;
  readonly hoursPerWeek?: number;
  readonly partTime?: boolean;
  // The advert's country, for a currency or a period left unnamed.
  readonly country?: string;
}

// A pay that passed the checks: the advert's own figures for the card, a top alone being a
// ceiling (low 0: «up to €60,000», the owner, 15 November 2026, DAA-28), and the top in euros a
// year for the filter, or null for a part-time pay by the hour, day or week with no hours stated.
export interface CheckedPay {
  readonly low: number;
  readonly high: number;
  readonly currency: string;
  readonly period: PayPeriod;
  readonly yearlyEur: number | null;
}

// A believable year in euros, and how many times its bottom the top of a range may be. The bounds
// catch the usual slip in both directions: a month's pay labelled as a year's falls under €7,000
// (about the lowest EU minimum wage for a year's full-time work), and a year's pay of €25,000 or
// more labelled as a month's rises over €300,000.
const YEAR_EUR = { least: 7000, most: 300_000 };
const WIDEST_RANGE = 5;

// A full-time week; a part-time pay with its weekly hours stated is checked as the full-time pay
// it amounts to (3,500 koruna a month for four hours a week is a real pay). Fewer than four hours
// a week is taken for a slip of the source's form; fewer than thirty is part time (the OECD's
// line), whose pay names its period or is not read.
const FULL_TIME_HOURS = 40;
const FEWEST_HOURS = 4;
const MOST_HOURS = 60;
const PART_TIME_UNDER = 30;

const EUROS_ONLY: Rates = { EUR: 1 };

// The pay as given, checked and put in euros a year (legacy `readPay`), or null when anything is
// unsure. `rates` are the ECB's, units for one euro.
export function readPay(
  given: PayGiven,
  rates: Rates = EUROS_ONLY,
): CheckedPay | null {
  const country = (given.country ?? "").toLowerCase();
  const first = fieldOf(given.min, country);
  const second = fieldOf(given.max, country);
  if (first.currency && second.currency && first.currency !== second.currency)
    return null;
  if (first.period && second.period && first.period !== second.period)
    return null;
  // What the pay field itself shows beats the fields beside it: a page that shows "€150,000" over
  // a currency left at its plugin's "USD" means euros, and "£27,000 p.a." under "MONTH" means a
  // year. A «$» stuck to the figure with no currency field is no currency of the country's:
  // «$80,000» in Spain is not euros (DAA-05).
  const currency =
    first.currency ||
    second.currency ||
    ((first.dollar || second.dollar) &&
    NO_CURRENCY.test(cleanCurrency(given.currency))
      ? ""
      : currencyOf(given.currency, country));
  const low = first.low || second.low;
  const high = second.high || first.high;
  const ceiling = !first.low && second.low > 0 && second.low === second.high;
  if (!low || !currency) return null;
  if (high < low || high > low * WIDEST_RANGE) return null;
  const rate =
    currency === "EUR"
      ? 1
      : Object.hasOwn(rates, currency)
        ? rates[currency]
        : 0;
  if (!rate) return null;
  const statedHours = given.hoursPerWeek ?? 0;
  const hours =
    statedHours >= FEWEST_HOURS && statedHours <= MOST_HOURS ? statedHours : 0;
  const partTime = given.partTime ?? false;
  const fullTimeJob = !partTime && !(hours && hours < PART_TIME_UNDER);
  const said =
    first.period ||
    second.period ||
    periodOf(given.period) ||
    (fullTimeJob
      ? periodByLaw(
          low / rate,
          high / rate,
          country,
          first.cents || second.cents,
        )
      : "");
  const period =
    said === "month" && yearCalledMonth(low / rate, high / rate, country)
      ? "year"
      : said;
  if (!period) return null;
  const units = period === "hour" && hours ? hours * 52 : PER_YEAR[period];
  const yearLow = (low * units) / rate;
  const yearHigh = (high * units) / rate;
  const fullTime = hours ? Math.max(1, FULL_TIME_HOURS / hours) : 1;
  if (yearLow * fullTime < YEAR_EUR.least || yearHigh > YEAR_EUR.most)
    return null;
  const yearly =
    !(partTime && ["hour", "day", "week"].includes(period)) ||
    (period === "hour" && hours > 0);
  return {
    low: ceiling ? 0 : low,
    high,
    currency,
    period,
    yearlyEur: yearly ? Math.round(yearHigh / 100) * 100 : null,
  };
}
