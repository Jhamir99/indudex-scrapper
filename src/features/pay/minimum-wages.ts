import type { PayPeriod } from "./periods.js";

// A full-time pay that names no period is read by the law, as the legacy's decision 3 read NVA's:
// a full-time month cannot pay less than the country's minimum wage, nor a year less than twelve
// of them, nor an hour less than its share. Monthly minimum wages in euros on 1 January 2026
// (Eurostat, earn_mw_cur, on a basis of twelve payments a year); Britain's from its National
// Living Wage, £12.71 an hour from April 2026, for 40 hours a week. A country with no statutory
// minimum is not read this way.
// The year the table is of: a test fails when it is not this year's, to renew it (DAA-30).
export const MINIMUM_WAGE_YEAR = 2026;

const MINIMUM_MONTH_EUR: Readonly<Record<string, number>> = {
  be: 2112,
  bg: 620,
  cz: 924,
  de: 2343,
  ee: 886,
  ie: 2391,
  gr: 1027,
  es: 1425,
  fr: 1823,
  hr: 1050,
  cy: 1088,
  lv: 780,
  lt: 1153,
  lu: 2704,
  hu: 838,
  mt: 994,
  nl: 2295,
  pl: 1139,
  pt: 1073,
  ro: 795,
  si: 1482,
  sk: 915,
  me: 670,
  mk: 586,
  al: 517,
  rs: 744,
  tr: 654,
  md: 319,
  gb: 2571,
};

const minimumMonth = (country: string): number | undefined =>
  Object.hasOwn(MINIMUM_MONTH_EUR, country)
    ? MINIMUM_MONTH_EUR[country]
    : undefined;

// A month: from 80 % of the minimum (a month of fourteen paid a year) to five times it (99 % of
// the stated months on 24 October 2026). A year: from 90 % of twelve minimum months, and never
// under €15,000, where the best-paid months of the countries of low minimum wages and their
// worst-paid years meet. An hour: from 80 % to five times the hourly minimum, written with its
// cents ("19.70"), for a bare "45" may be a year in thousands. Anything between, refused.
const MONTH_FROM = 0.8;
const MONTH_TO = 5;
const YEAR_FROM = 0.9;
const YEAR_LEAST_EUR = 15_000;
const HOURS_A_MONTH = (40 * 52) / 12;

// Where pay is stated by the year (Britain 22,361 years to 52 months on 24 October 2026, Ireland
// 1,018 to 8, Malta 453 to 0), a figure in the months' range is more likely a part-time year than
// a month: not read as one.
const YEARS_ONLY = new Set(["gb", "ie", "mt"]);

const leastYear = (least: number) =>
  Math.max(YEAR_FROM * 12 * least, YEAR_LEAST_EUR);

// The period a full-time pay in euros names by its size, or "" when it names none.
export function periodByLaw(
  low: number,
  high: number,
  country: string,
  cents: boolean,
): PayPeriod | "" {
  const least = minimumMonth(country);
  if (!least) return "";
  if (
    cents &&
    low >= (MONTH_FROM * least) / HOURS_A_MONTH &&
    high <= (MONTH_TO * least) / HOURS_A_MONTH
  )
    return "hour";
  if (
    !YEARS_ONLY.has(country) &&
    low >= MONTH_FROM * least &&
    high <= MONTH_TO * least
  )
    return "month";
  return low >= leastYear(least) ? "year" : "";
}

// Over this a «month» is no year's slip but cents or a wrong field («280000 MONTH» for a welder):
// not read.
const YEAR_CALLED_MONTH_MOST = 150_000;

// A month the source names whose figures (in euros) pass five minimum months and reach a year's
// least is a year's pay labelled as a month's: «18.000 € al mes» in Spain is 18,000 a year, not
// 216,000 (NO2-05). A country with no minimum keeps its month.
export function yearCalledMonth(
  low: number,
  high: number,
  country: string,
): boolean {
  const least = minimumMonth(country);
  return (
    least !== undefined &&
    least > 0 &&
    high > MONTH_TO * least &&
    low >= leastYear(least) &&
    high <= YEAR_CALLED_MONTH_MOST
  );
}
