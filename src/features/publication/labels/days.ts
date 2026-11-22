import { fold } from "../../../shared/kit/fold.js";

// The days an advert states (legacy builder/lib/labels.mjs deadlineInText and postedInText, and
// toRecord's day rules in builder/normalise.mjs; word for word but for types).

// A text folded for reading words, its quotes and joiners as spaces (legacy builder/contract.mjs).
const foldedLines = (s: string): string =>
  fold(String(s || ""))
    .replace(/["'“”«»]/g, " ")
    .replace(/[ \t_-]+/g, " ");

// A day of the calendar only: «2026-13-01» or «2027-02-31» from a source's field or a text names none, and on the page it
// threw while the card drew its details (the security review, 6 November 2026).
export const isoDay = (v: unknown): string => {
  const day = String(v || "")
    .trim()
    .slice(0, 10);
  const at = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? Date.parse(`${day}T00:00:00Z`)
    : NaN;
  return !Number.isNaN(at) && new Date(at).toISOString().slice(0, 10) === day
    ? day
    : "";
};

// The last day to apply as a line of the text writes it, labelled («Sista ansökningsdag: 2026-11-19», «Søknadsfrist:
// 08.11.2026», «Die Bewerbungsfrist endet am 15.11.2026», "Closing date: 15 November 2026"), for a source with no
// field of it (the text corpus, 1 November 2026: 56 of 3,122 pages wrote one no card showed). Only after such a label.
const DEADLINE =
  /(?:sista ansökningsdag|sista dag att söka|søknadsfrist|ansøgningsfrist|bewerbungsfrist(?: endet am)?|bewerbungsschluss|bewerbung bis(?: zum)?|closing date|application deadline|deadline for applications|applications close(?: on)?|apply by|date limite de candidature|date limite|fecha límite(?: de solicitud)?|data limite|scadenza|sluitingsdatum|reageren kan tot(?: en met)?|uiterste reactiedatum)\s*[:.]?\s*(?:am|le|el|on|op|il|den|tot)?\s*([^\n]{6,40})/i;
const MONTHS: Readonly<Record<string, number>> = {
  jan: 1,
  janv: 1,
  januar: 1,
  january: 1,
  enero: 1,
  januari: 1,
  feb: 2,
  fevr: 2,
  februar: 2,
  february: 2,
  febrero: 2,
  februari: 2,
  mar: 3,
  mars: 3,
  marz: 3,
  march: 3,
  marzo: 3,
  maart: 3,
  apr: 4,
  avr: 4,
  avril: 4,
  april: 4,
  abril: 4,
  may: 5,
  mai: 5,
  mayo: 5,
  maj: 5,
  mei: 5,
  jun: 6,
  juin: 6,
  juni: 6,
  june: 6,
  junio: 6,
  jul: 7,
  juil: 7,
  juillet: 7,
  juli: 7,
  july: 7,
  julio: 7,
  aug: 8,
  aout: 8,
  august: 8,
  agosto: 8,
  augusti: 8,
  augustus: 8,
  sep: 9,
  sept: 9,
  september: 9,
  septembre: 9,
  septiembre: 9,
  oct: 10,
  okt: 10,
  october: 10,
  octobre: 10,
  oktober: 10,
  octubre: 10,
  nov: 11,
  november: 11,
  novembre: 11,
  noviembre: 11,
  dec: 12,
  dez: 12,
  dezember: 12,
  december: 12,
  decembre: 12,
  diciembre: 12,
};
const iso = (y: string, m: number, d: number): string =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31
    ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    : "";
const dayInWords = (said: string | undefined): string => {
  if (!said) return "";
  let m = said.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(m[1] ?? "", Number(m[2]), Number(m[3]));
  m = said.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|\d{2})(?!\d)/);
  if (m) {
    const year = m[3] ?? "";
    return iso(
      year.length === 2 ? `20${year}` : year,
      Number(m[2]),
      Number(m[1]),
    );
  }
  m = foldedLines(said)
    .toLowerCase()
    .match(/(?<!\d)(\d{1,2})\.?\s+(?:de\s+)?([a-z]+)\.?\s+(?:de\s+)?(20\d{2})/);
  const month =
    m && Object.hasOwn(MONTHS, m[2] ?? "") ? MONTHS[m[2] ?? ""] : undefined;
  return m && month ? iso(m[3] ?? "", month, Number(m[1])) : "";
};
export const deadlineInText = (text: string): string =>
  dayInWords(String(text || "").match(DEADLINE)?.[1]);
// The day the advert says it was posted, after a label of its own («Aktualität: 15.10.2026», «Stellenbeschreibung Datum:
// 21. Oktober 2025», "Date posted: …") or a phrase («Ausgeschrieben seit 31.10.2026», «Online seit», "Posted on",
// «Publicado el»): for a source with no posting day, before the day the crawler first saw it, which made a year-old
// advert look new (the readers' faults, 1 November 2026). «Eingestellt» counts only before a colon or «am»: alone it is
// also «hired».
const POSTED =
  /(?:(?:aktualität|aktualitaet|eingestellt|veröffentlicht|veroeffentlicht|stellenbeschreibung datum|erscheinungsdatum|datum der ausschreibung|date posted|posted|publication date|published|fecha de publicación|fecha de publicacion|publicado|date de publication|publiée?|datum van plaatsing|geplaatst|data di pubblicazione|pubblicato)\s*:|ausgeschrieben seit|online seit|veröffentlicht am|veroeffentlicht am|eingestellt am|posted on|published on|publicado el|publiée? le|mise en ligne le|geplaatst op|pubblicato il)\s*([^\n]{6,40})/i;
export const postedInText = (text: string): string =>
  dayInWords(String(text || "").match(POSTED)?.[1]);

// How old an advert may be for an end day equal to its posting day to be ignored.
const FRESH_DAYS = 60;
const DAY_MS = 86_400_000;
const dayAfter = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

export interface AdvertDays {
  // The day it was posted: its source's when past, else its text's ("" when neither).
  readonly d: string;
  // With no such day, the first day it was in the store: for the date filters and the year's cut.
  readonly fs?: string;
  // The last day to apply, when stated and believable.
  readonly x?: string;
}

// An advert's days (FR-3). A posting day still to come is none: some pages send an apprenticeship's
// start or the closing day in its place (one day of slack for the time zones). The store's first
// day is never taken for a posting day: on a source's first pass it is the day of that pass for
// adverts up long before (the operator's choice, 2026-11-22). A last day is the source's, else the
// text's while ahead; never one more than 400 days away (prospective.ch writes ten years ahead) or
// more than six months after the advert's day (Raiffeisen's year-long validThrough), nor, for a
// fresh advert, one on or before its posting day (Manfred writes the posting day in both).
export function advertDays(
  advert: {
    readonly posted?: string | undefined;
    readonly expires?: string | undefined;
    readonly firstSeen: string;
    readonly description: string;
  },
  today: string,
): AdvertDays {
  const latest = dayAfter(today, 1);
  const pastDay = (value: unknown) => {
    const day = isoDay(value);
    return day <= latest ? day : "";
  };
  const posted = pastDay(advert.posted);
  const d = posted || pastDay(postedInText(advert.description));
  const stated = isoDay(advert.expires);
  const written = stated ? "" : deadlineInText(advert.description);
  const end = stated || (written >= today ? written : "");
  const from = posted || today;
  const placeholder = end > dayAfter(today, 400) || end > dayAfter(from, 183);
  const sameDay =
    posted && end <= posted && posted >= dayAfter(today, -FRESH_DAYS);
  return {
    d,
    ...(d ? {} : { fs: isoDay(advert.firstSeen) }),
    ...(end && !placeholder && !sameDay ? { x: end } : {}),
  };
}
