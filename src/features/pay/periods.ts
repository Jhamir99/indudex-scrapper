import { words } from "../../shared/words/index.js";

export const PAY_PERIODS = ["hour", "day", "week", "month", "year"] as const;
export type PayPeriod = (typeof PAY_PERIODS)[number];

// The period, from the words the sources use: schema.org (HOUR…YEAR), Lever ("per-year-salary"),
// Ashby ("1 YEAR"), Recruitee ("year"), Personio ("yearly"), and the words employers' pages write
// in their own languages ("MAAND", "an", "pro Stunde", "p/u"), ISO 8601 durations (P1Y) and
// UN/CEFACT unit codes (ANN): those words were 2,900 of the pays left unread on 24 October 2026.
// Anything else, "bi-week-salary" for one, is not read.
const PERIOD_WORDS: Readonly<Record<PayPeriod, string>> = {
  hour: "hour hourly hr hrs h ph uur u stunde stundlich std heure horaire hora horas ora oraria timme tunti godzina hodina pt1h hur",
  day: "day daily dag tag taglich jour journalier journee dia diario giorno giornaliero paiva dzien den nap p1d",
  week: "week weekly woche wochentlich semaine hebdomadaire semana semanal settimana vecka uge uke viikko tydzien tyden het p1w wee",
  month:
    "month monthly mo mth mths pm maand mnd maandelijks monat monatlich mois mensuel mes mensual mese mensile manad maned kuukausi miesiac mesic honap p1m mon",
  year: "year yearly yr yrs annual annually annum pa jaar jaarlijks jahr jahrlich an annee annuel ano anual any anno annuale ar vuosi rok ev p1y ann",
};

const PERIODS = new Map<string, PayPeriod>([
  ["per-hour-wage", "hour"],
  ["per-day-wage", "day"],
  ["per-week-salary", "week"],
  ["per-month-salary", "month"],
  ["per-year-salary", "year"],
]);
for (const period of PAY_PERIODS)
  for (const word of PERIOD_WORDS[period].split(" ")) PERIODS.set(word, period);
// And every language's word for the unit (src/shared/words), where the list above has none of its
// own; a stem ("Stunde*") is no word of its own.
for (const period of PAY_PERIODS)
  for (const word of words(period, { folded: true }))
    if (!word.endsWith("*") && !PERIODS.has(word)) PERIODS.set(word, period);

// "1 YEAR", "per annum", "PerHour", "pro Stunde", "/mes", "p/maand", "a year": the word without
// its one or its "per".
const LEADING =
  /^(?:(?:1|one|per|pro|par|por|al|an|a|each|je)\s+|p?\/\s*|per(?=[a-z]{3,}$))/;

export function periodOf(word: unknown): PayPeriod | "" {
  // Accents off as the legacy took them off (combining marks U+0300-U+036F), lower case, no dots.
  const plain = String(word ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
  return PERIODS.get(plain) ?? PERIODS.get(plain.replace(LEADING, "")) ?? "";
}

// Units a year for a full-time job: Google Cloud Talent Solution's defaults.
export const PER_YEAR: Readonly<Record<PayPeriod, number>> = {
  hour: 2080,
  day: 260,
  week: 52,
  month: 12,
  year: 1,
};
