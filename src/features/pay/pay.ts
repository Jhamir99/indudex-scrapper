// ➤ Pay, as the employer states it: the figures, the currency and the period, from the fields
// ➤ each source gives for pay (never read out of the advert's text, never estimated). The same
// ➤ pay in euros a year feeds the filter. Anything unsure is refused. docs/research/salary.md
// ➤ has the reasons and the sources.
// The legacy's builder/pay.ts, copied (legacy resync T004): only its imports changed. Its own comments keep their marks.
import { foldLetters } from "../../shared/kit/fold.js";
import { words } from "../../shared/words/index.js";

// ➤ The period's letter, from the words the sources use: schema.org (HOUR…YEAR), Lever
// ➤ ("per-year-salary"), Ashby ("1 YEAR"), Recruitee ("year"), Personio ("yearly"), and the
// ➤ words employers' pages write in their own languages ("MAAND", "an", "pro Stunde", "p/u"),
// ➤ ISO 8601 durations (P1Y) and UN/CEFACT unit codes (ANN): those words were 2,900 of the pays
// ➤ left unread on 24 October 2026. Anything else, "bi-week-salary" for one, is not read.
const WORDS = {
  h: "hour hourly hr hrs h ph uur u stunde stundlich std heure horaire hora horas ora oraria timme tunti godzina hodina pt1h hur",
  d: "day daily dag tag taglich jour journalier journee dia diario giorno giornaliero paiva dzien den nap p1d",
  w: "week weekly woche wochentlich semaine hebdomadaire semana semanal settimana vecka uge uke viikko tydzien tyden het p1w wee",
  m: "month monthly mo mth mths pm maand mnd maandelijks monat monatlich mois mensuel mes mensual mese mensile manad maned kuukausi miesiac mesic honap p1m mon",
  y: "year yearly yr yrs annual annually annum pa jaar jaarlijks jahr jahrlich an annee annuel ano anual any anno annuale ar vuosi rok ev p1y ann",
};
const PERIODS: Record<string, string> = {
  "per-hour-wage": "h",
  "per-day-wage": "d",
  "per-week-salary": "w",
  "per-month-salary": "m",
  "per-year-salary": "y",
};
for (const [letter, list] of Object.entries(WORDS))
  for (const word of list.split(" ")) PERIODS[word] = letter;
// ➤ And every language's word for the unit (builder/words), where the list above has none of its own.
const UNITS = { h: "hour", d: "day", w: "week", m: "month", y: "year" };
for (const [letter, concept] of Object.entries(UNITS))
  for (const word of words(concept, { folded: true }))
    if (!word.endsWith("*")) PERIODS[word] ??= letter;
// ➤ "1 YEAR", "per annum", "PerHour", "pro Stunde", "/mes", "p/maand", "a year": the word without
// ➤ its one or its "per".
export function periodOf(word: unknown): string {
  const s = foldLetters(word).replace(/\./g, "").trim();
  return (
    PERIODS[s] ||
    PERIODS[
      s.replace(
        /^(?:(?:1|one|per|pro|par|por|al|an|a|each|je)\s+|p?\/\s*|per(?=[a-z]{3,}$))/,
        "",
      )
    ] ||
    ""
  );
}

// ➤ Units a year for a full-time job: Google Cloud Talent Solution's defaults.
export const PER_YEAR: Record<string, number> = {
  h: 2080,
  d: 260,
  w: 52,
  m: 12,
  y: 1,
};

// ➤ An ISO 4217 code: the code itself, or a sign or word that names one currency only ("€",
// ➤ "Euro", "&euro;", "zł"), alone or repeated ("Euro €"); "kr" and "Fr." where the country tells
// ➤ whose crown or franc. A pay that names no currency at all is in its country's, when the
// ➤ country has one: 2,600 pays left unread on 24 October 2026 named none, their sites writing
// ➤ "45000" in a country of one currency. SEEK, the job board, takes a job's currency from its
// ➤ location the same way, unless the employer picks another (docs/research/salary.md). A sign
// ➤ several currencies share ("$") or a word this list does not know is still refused.
const NAMES: Record<string, string> = {
  "€": "EUR",
  euro: "EUR",
  euros: "EUR",
  "£": "GBP",
  pound: "GBP",
  pounds: "GBP",
  sterling: "GBP",
  zł: "PLN",
  zl: "PLN",
  zloty: "PLN",
  kč: "CZK",
  kc: "CZK",
  ft: "HUF",
  lei: "RON",
};
const BY_COUNTRY: Record<string, Record<string, string>> = {
  kr: { se: "SEK", no: "NOK", dk: "DKK", fo: "DKK", is: "ISK" },
  fr: { ch: "CHF", li: "CHF" },
  sfr: { ch: "CHF", li: "CHF" },
};
// ➤ The countries of one currency (Bulgaria's has been the euro since 1 January 2026).
const OWN: Record<string, string> = {
  gb: "GBP",
  ch: "CHF",
  li: "CHF",
  se: "SEK",
  no: "NOK",
  dk: "DKK",
  fo: "DKK",
  is: "ISK",
  pl: "PLN",
  cz: "CZK",
  hu: "HUF",
  ro: "RON",
  tr: "TRY",
  rs: "RSD",
  ba: "BAM",
  mk: "MKD",
  al: "ALL",
  ua: "UAH",
  md: "MDL",
};
for (const cc of "ad at be bg cy de ee es fi fr gr hr ie it lt lu lv mc me mt nl pt si sk sm va xk".split(
  " ",
))
  OWN[cc] = "EUR";
const NONE = /^(?:|n\/?a|none|null|undefined|-|unknown)$/;
const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&euro;|&#8364;|&#x20ac;/gi, "€")
    .replace(/&pound;|&#163;|&#xa3;/gi, "£")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
// ➤ The one currency a sign or word names, alone or with others that name the same, or none.
function named(sign: unknown, cc: string): string {
  const each = clean(sign)
    .split(/[\s()/,]+/)
    .filter(Boolean)
    .map((w) => {
      const word = w.replace(/\.$/, "");
      return (
        NAMES[word] ||
        (BY_COUNTRY[word]
          ? BY_COUNTRY[word][cc] || ""
          : /^[a-z]{3}$/.test(word)
            ? word.toUpperCase()
            : "")
      );
    });
  return each.length && each.every((c) => c && c === each[0]) ? each[0] : "";
}
export function currencyOf(value: unknown, country: unknown = ""): string {
  const cc = String(country || "").toLowerCase();
  return NONE.test(clean(value)) ? OWN[cc] || "" : named(value, cc);
}

// ➤ A figure: a number, or one written for people the way sources write it: "45000", "45.000",
// ➤ "45,000", "45 000", "45'000", "3.772,00", "45.000,-", "45k", with its currency's sign or code
// ➤ beside it ("€ 45.000", "45000 EUR", "45 000 kr"), which names the currency ("$" names none:
// ➤ it is several). A separator followed by exactly three digits groups thousands, always the
// ➤ same one; the other sign, followed by one or two digits, gives the cents. Mixed or doubtful
// ➤ grouping ("1.234,567"), a word beside the figure ("75000 OTE", "ab 3.000") or a negative
// ➤ figure is not read, rather than read wrong. → { value, currency, cents }
type Figure = {
  value: number;
  currency: string;
  cents: boolean;
  k?: boolean;
  dollar?: boolean;
};
const NO_FIGURE: Figure = { value: 0, currency: "", cents: false };
function figure(text: string, cc: string): Figure {
  // ➤ The «K» of «Kč» is no thousands (DAA-22).
  const m = text.match(
    /^([^\d\s]*)\s*(\d[\d.,' \u2019]*?)\s*([kK](?!\p{L}))?\s*([^\d\s]*)$/u,
  );
  if (!m || (m[1] && m[4])) return NO_FIGURE;
  const sign = m[1] || m[4];
  const currency = sign && sign !== "$" ? named(sign, cc) : "";
  if (sign && sign !== "$" && !currency) return NO_FIGURE;
  const dollar = sign === "$";
  const s = m[2].trim();
  if (m[3])
    return /^\d+(?:[.,]\d+)?$/.test(s)
      ? {
          value: Math.round(Number(s.replace(",", ".")) * 1000),
          currency,
          cents: false,
          k: true,
          dollar,
        }
      : NO_FIGURE;
  const grouped = s.match(
    /^(\d{1,3}([., '\u2019])\d{3}(?:\2\d{3})*)(?:(?!\2)[.,](\d{1,2}))?$/,
  );
  if (grouped)
    return {
      value: Number(
        grouped[1].replace(/\D/g, "") + (grouped[3] ? `.${grouped[3]}` : ""),
      ),
      currency,
      cents: Boolean(grouped[3]),
      dollar,
    };
  const plain = s.match(/^\d+(?:[.,](\d+))?$/);
  return plain
    ? {
        value: Math.round(Number(s.replace(",", ".")) * 100) / 100,
        currency,
        cents: Boolean(plain[1] && plain[1].length <= 2),
        dollar,
      }
    : NO_FIGURE;
}

// ➤ A pay field as written: one figure, or a range in one field ("£35,000 - £40,000", "35.000
// ➤ bis 45.000 €"), with its period's words after it ("£27,000 p.a.", "£13.40 per hour", "16,20
// ➤ p/u"), which name the period, and a remark in brackets at its end ("(depending on
// ➤ experience)") left aside. → { low, high, currency, period, cents }
type Field = {
  low: number;
  high: number;
  currency: string;
  period: string;
  cents: boolean;
  dollar?: boolean;
};
const NO_FIELD: Field = {
  low: 0,
  high: 0,
  currency: "",
  period: "",
  cents: false,
};
function field(value: unknown, country: unknown): Field {
  if (typeof value === "number")
    return value > 0 && Number.isFinite(value)
      ? {
          low: Math.round(value * 100) / 100,
          high: Math.round(value * 100) / 100,
          currency: "",
          period: "",
          cents: !Number.isInteger(value),
        }
      : NO_FIELD;
  const cc = String(country || "").toLowerCase();
  // ➤ «45.000,- EUR» writes no cents before its currency either (DAA-22).
  let s = String(value ?? "")
    .replace(/[\u00a0\u202f\u2009]/g, " ")
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim()
    .replace(/[.,][-\u2013]$/, "")
    .replace(/(\d)[.,][-\u2013](?=\s*[^\d\s]+$)/, "$1");
  if (!/\d/.test(s) || /^-\s*\d/.test(s)) return NO_FIELD;
  let period = "";
  const glued = s.match(/^(.*\d.*?)\s*((?:p\s*)?\/\s*[a-z.]+)$/i);
  if (glued && periodOf(glued[2])) {
    period = periodOf(glued[2]);
    s = glued[1];
  }
  const words = s.split(" ");
  for (let k = Math.min(3, words.length - 1); k >= 1 && !period; k--) {
    const p = periodOf(words.slice(-k).join(" "));
    if (p) {
      period = p;
      s = words
        .slice(0, -k)
        .join(" ")
        .replace(/[.,][-\u2013]$/, "");
    }
  }
  const parts = s
    .split(/\s*[-\u2013\u2014]\s*(?=\D{0,4}\d)|\s+(?:to|bis|tot|à|a)\s+/i)
    .filter((x) => x.trim());
  if (parts.length > 2 || (parts.length === 2 && !/\d/.test(parts[0])))
    return NO_FIELD;
  const [a, b = a] = parts.map((x) => figure(x.trim(), cc));
  if (
    !a.value ||
    !b.value ||
    (a.currency && b.currency && a.currency !== b.currency)
  )
    return NO_FIELD;
  // ➤ «35-45k» writes its thousands once, at the end (DAA-22).
  const low = b.k && !a.k && a.value < 1000 ? a.value * 1000 : a.value;
  return {
    low,
    high: b.value,
    currency: a.currency || b.currency,
    period,
    cents: a.cents || b.cents,
    dollar: a.dollar || b.dollar,
  };
}

// ➤ A full-time pay that names no period is read by the law, as decision 3 reads NVA's: a
// ➤ full-time month cannot pay less than the country's minimum wage, nor a year less than twelve
// ➤ of them, nor an hour less than its share. Monthly minimum wages in euros on 1 January 2026
// ➤ (Eurostat, earn_mw_cur, on a basis of twelve payments a year); Britain's from its National
// ➤ Living Wage, £12.71 an hour from April 2026, for 40 hours a week. A country with no statutory
// ➤ minimum (Italy, Austria, the Nordics, Switzerland) reads only a year, from €25,000: no month is
// ➤ so high there, and Italy writes its pay by the year («Retribuzione: €50.000 - €60.000»).
// ➤ The year the table is of: a test fails when it is not this year's, to renew it (DAA-30).
export const MINIMUM_WAGE_YEAR = 2026;
const MINIMUM_MONTH_EUR: Record<string, number> = {
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
// ➤ A month: from 80 % of the minimum (a month of fourteen paid a year) to five times it (99 % of
// ➤ the stated months on 24 October 2026). A year: from 90 % of twelve minimum months, and never
// ➤ under €15,000, where the best-paid months of the countries of low minimum wages and their
// ➤ worst-paid years meet. An hour: from 80 % to five times the hourly minimum, written with its
// ➤ cents ("19.70"), for a bare "45" may be a year in thousands. Anything between, refused.
const MONTH_FROM = 0.8,
  MONTH_TO = 5,
  YEAR_FROM = 0.9,
  YEAR_LEAST_EUR = 15000,
  HOURS_A_MONTH = (40 * 52) / 12;
// ➤ Where pay is stated by the year (Britain 22,361 years to 52 months on 24 October 2026, Ireland
// ➤ 1,018 to 8, Malta 453 to 0), a figure in the months' range is more likely a part-time year
// ➤ than a month: not read as one.
const YEARS_ONLY = new Set(["gb", "ie", "mt"]);
const NO_MINIMUM = new Set([
  "it",
  "at",
  "dk",
  "fi",
  "se",
  "no",
  "is",
  "ch",
  "li",
]);
const YEAR_LEAST_WITHOUT_MINIMUM = 25000;
function periodByLaw(low: number, high: number, cc: string, cents: boolean) {
  const least = MINIMUM_MONTH_EUR[cc];
  if (!least)
    return NO_MINIMUM.has(cc) && low >= YEAR_LEAST_WITHOUT_MINIMUM ? "y" : "";
  if (
    cents &&
    low >= (MONTH_FROM * least) / HOURS_A_MONTH &&
    high <= (MONTH_TO * least) / HOURS_A_MONTH
  )
    return "h";
  if (
    !YEARS_ONLY.has(cc) &&
    low >= MONTH_FROM * least &&
    high <= MONTH_TO * least
  )
    return "m";
  return low >= Math.max(YEAR_FROM * 12 * least, YEAR_LEAST_EUR) ? "y" : "";
}
// ➤ A month the source names whose figures pass five minimum months and reach a year's least is a year's pay labelled as
// ➤ a month's: «18.000 € al mes» in Spain is 18,000 a year, not 216,000 (NO2-05). A country with no minimum keeps its month.
function yearCalledMonth(low: number, high: number, cc: string) {
  const least = MINIMUM_MONTH_EUR[cc];
  return (
    !!least &&
    high > MONTH_TO * least &&
    low >= Math.max(YEAR_FROM * 12 * least, YEAR_LEAST_EUR) &&
    high <= YEAR_CALLED_MONTH_MOST
  );
}
// ➤ Over this a «month» is no year's slip but cents or a wrong field («280000 MONTH» for a welder): not read.
const YEAR_CALLED_MONTH_MOST = 150000;

// ➤ A believable year in euros, and how many times its bottom the top of a range may be. The
// ➤ bounds catch the usual slip in both directions: a month's pay labelled as a year's falls
// ➤ under €7,000 (about the lowest EU minimum wage for a year's full-time work), and a year's
// ➤ pay of €25,000 or more labelled as a month's rises over €300,000.
const YEAR_EUR = { least: 7000, most: 300000 };
const WIDEST_RANGE = 5;
// ➤ A full-time week; a part-time pay with its weekly hours stated is checked as the full-time
// ➤ pay it amounts to (3,500 koruna a month for four hours a week is a real pay). Fewer than
// ➤ four hours a week is taken for a slip of the source's form; fewer than thirty is part time
// ➤ (the OECD's line), whose pay names its period or is not read.
const FULL_TIME_HOURS = 40;
const FEWEST_HOURS = 4;
const PART_TIME_UNDER = 30;

// ➤ { min, max, currency, period } as the source gives them, and the advert's country (for a
// ➤ currency or a period left unnamed) → { p, pa } or null.
// ➤ p: [min, max, currency, period letter], the advert's own figures, for the card; a top alone is a ceiling, its min 0
// ➤ («up to €60,000»: the owner, 15 November 2026, DAA-28).
// ➤ pa: the top of the range in euros a year, for the filter. An hourly pay uses the weekly
// ➤ hours when the source states them; a part-time advert paid by the hour, day or week with
// ➤ no hours stated gets no yearly figure. `rates` are the ECB's, units for one euro.
// ➤ A pay as a source gives it.
export type PayFields = {
  min?: unknown;
  max?: unknown;
  currency?: unknown;
  period?: unknown;
  // ➤ The figures were written with cents, though given as numbers («22,00» read as 22).
  cents?: boolean;
  hoursPerWeek?: number;
  partTime?: boolean;
  country?: string;
};
export type Pay = { p: [number, number, string, string]; pa?: number };
export function readPay(
  {
    min,
    max,
    currency,
    period,
    cents = false,
    hoursPerWeek = 0,
    partTime = false,
    country = "",
  }: PayFields = {},
  rates: Record<string, number> = { EUR: 1 },
): Pay | null {
  const a = field(min, country),
    b = field(max, country);
  if (a.currency && b.currency && a.currency !== b.currency) return null;
  if (a.period && b.period && a.period !== b.period) return null;
  // ➤ What the pay field itself shows beats the fields beside it: a page that shows "€150,000"
  // ➤ over a currency left at its plugin's "USD" means euros, and "£27,000 p.a." under "MONTH"
  // ➤ means a year.
  // ➤ A «$» stuck to the figure with no currency field is no currency of the country's: «$80,000» in Spain is not euros (DAA-05).
  const cur =
    a.currency ||
    b.currency ||
    ((a.dollar || b.dollar) && NONE.test(clean(currency))
      ? ""
      : currencyOf(currency, country));
  const low = a.low || b.low,
    high = b.high || a.high;
  const ceiling = !a.low && b.low > 0 && b.low === b.high;
  if (!low || !cur) return null;
  if (high < low || high > low * WIDEST_RANGE) return null;
  const rate = cur === "EUR" ? 1 : rates[cur];
  if (!rate) return null;
  const hours =
    hoursPerWeek >= FEWEST_HOURS && hoursPerWeek <= 60 ? hoursPerWeek : 0;
  const fullTimeJob = !partTime && !(hours && hours < PART_TIME_UNDER);
  const cc = String(country || "").toLowerCase();
  const said =
    a.period ||
    b.period ||
    periodOf(period) ||
    (fullTimeJob
      ? periodByLaw(low / rate, high / rate, cc, cents || a.cents || b.cents)
      : "");
  const per =
    said === "m" && yearCalledMonth(low / rate, high / rate, cc) ? "y" : said;
  if (!per) return null;
  const units = per === "h" && hours ? hours * 52 : PER_YEAR[per];
  const yearLow = (low * units) / rate,
    yearHigh = (high * units) / rate;
  const fullTime = hours ? Math.max(1, FULL_TIME_HOURS / hours) : 1;
  if (yearLow * fullTime < YEAR_EUR.least || yearHigh > YEAR_EUR.most)
    return null;
  const pay: Pay = { p: [ceiling ? 0 : low, high, cur, per] };
  if (!(partTime && "hdw".includes(per)) || (per === "h" && hours))
    pay.pa = Math.round(yearHigh / 100) * 100;
  return pay;
}
