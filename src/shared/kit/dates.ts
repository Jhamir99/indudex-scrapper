const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

// The day as the source writes it: the time and the zone are ignored, so "2026-11-01T23:30+01:00"
// stays the 1st, the day the source meant.
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/;
// European order, as the legacy sources write it: "01.11.2026", "01/11/2026", "01-11-2026", with or without a time.
const DAY_FIRST = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})(?:$|[ T,])/;
// RSS pubDate (RFC 822): "Sat, 01 Nov 2026 10:00:00 GMT".
const RFC_822 = /^(?:[a-z]{3},\s*)?(\d{1,2}) ([a-z]{3}) (\d{4})(?:$|\s)/i;

function day(year: number, month: number, date: number): string | undefined {
  const value = new Date(Date.UTC(year, month - 1, date));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== date
  )
    return undefined;
  return value.toISOString().slice(0, 10);
}

// A day as YYYY-MM-DD, or undefined when the input is no date this knows or no real day.
export function parseDay(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const text = input.trim();

  const iso = text.match(ISO);
  if (iso) return day(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirst = text.match(DAY_FIRST);
  if (dayFirst)
    return day(Number(dayFirst[4]), Number(dayFirst[3]), Number(dayFirst[1]));

  const rfc = text.match(RFC_822);
  if (rfc) {
    const month = MONTHS.indexOf(rfc[2]!.toLowerCase()) + 1;
    return month ? day(Number(rfc[3]), month, Number(rfc[1])) : undefined;
  }
  return undefined;
}

// A day as a page writes it, in the sites' languages (the legacy's builder/lib/crawl.ts `day`; job portals T004): what
// the layout reader and the careers reader read; `parseDay` stays the feeds' stricter reading.
// The day a site names. The schema asks for 2026-09-07 or a whole timestamp; sites also write
// the month unpadded ("2026-9-4", "2026/9/04"), the way Java prints a date ("Wed Sep 09
// 02:00:00 UTC 2026", every SAP SuccessFactors careers site), with the month in words
// ("September 9, 2026", "27 augustus 2026", "Wed, 09 Sep 2026") or with dots ("18.09.2026").
// Day and month in figures with slashes only when they cannot be swapped ("25/08/2026"); a
// date without its year ("Mon Aug 24") names no day.
// The months as the sites' languages write them, whole or shortened the usual way.
const WRITTEN_MONTHS = new Map<string, number>(
  [
    "january jan januar januari janvier enero gennaio janeiro",
    "february feb februar februari fevrier febrero febbraio fevereiro",
    "march mar marz maerz maart mars marzo marco marts",
    "april apr avril abril aprile",
    "may mai mei maj mayo maggio maio",
    "june jun juni juin junio giugno junho",
    "july jul juli juillet julio luglio julho",
    "august aug augustus augusti aout agosto",
    "september sep sept septembre septiembre settembre setembro",
    "october oct oktober octobre octubre ottobre outubro",
    "november nov novembre noviembre novembro",
    "december dec dezember decembre diciembre dicembre dezembro",
  ].flatMap((names, i) =>
    names.split(" ").map((n): [string, number] => [n, i + 1]),
  ),
);
const monthOf = (w: string): number =>
  WRITTEN_MONTHS.get(
    String(w).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
  ) || 0;
function calendarDay(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d ||
    y < 2000 ||
    y > new Date().getUTCFullYear() + 1
  )
    return "";
  return date.toISOString().slice(0, 10);
}
export function writtenDay(v: unknown): string {
  const s = String(v || "").trim();
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?![\d])/)))
    return calendarDay(+m[1], +m[2], +m[3]);
  if (
    (m = s.match(
      /^\p{L}{3,9},? (\p{L}{3,9})\.? (\d{1,2}) (?:\d{1,2}:\d{2}(?::\d{2})? )?(?:[a-z]{2,5} )?(\d{4})$/iu,
    )) &&
    monthOf(m[1])
  )
    return calendarDay(+m[3], monthOf(m[1]), +m[2]);
  if (
    (m = s.match(
      /^(?:\p{L}{3,9},? )?(\d{1,2})\.? (\p{L}{3,9})\.?,? (\d{4})(?![\d])/iu,
    )) &&
    monthOf(m[2])
  )
    return calendarDay(+m[3], monthOf(m[2]), +m[1]);
  if (
    (m = s.match(
      /^(\p{L}{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})(?![\d])/iu,
    )) &&
    monthOf(m[1])
  )
    return calendarDay(+m[3], monthOf(m[1]), +m[2]);
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d])/)))
    return calendarDay(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d])/))) {
    const [a, b] = [+m[1], +m[2]];
    if (a > 12 && b <= 12) return calendarDay(+m[3], b, a);
    if (b > 12 && a <= 12) return calendarDay(+m[3], a, b);
  }
  return "";
}
