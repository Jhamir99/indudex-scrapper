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
