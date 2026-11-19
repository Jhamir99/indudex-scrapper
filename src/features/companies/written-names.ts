import { fold } from "../../shared/kit/fold.js";

// A source's employer names as its adverts write them (legacy builder/lib/names.mjs's writtenNames
// and what it needs, word for word but for types; the boards' brandName and addressCode come with
// 016-career-sites).

const letters = (s: unknown): string =>
  fold(String(s || "")).replace(/[^a-z0-9]/g, "");

// Shouted words longer than an acronym come down: "LEIDOS" → Leidos, "KLA" stays.
const calm = (s: string): string =>
  s.replace(
    /[A-ZÀ-Ý]{5,}/g,
    (w: string) => (w[0] ?? "") + w.slice(1).toLowerCase(),
  );

// How an advert writes a name that is its board's address code: the same letters, apart or together, in any case;
// '' when it does not write it, null when the name is no such code.
function spelling(name: string, url: unknown, text: unknown): string | null {
  const code = String(name || "").toLowerCase();
  if (!/^[A-Z][a-z0-9]+$/.test(String(name || "")) || code.length < 6)
    return null;
  if (
    !fold(String(url || ""))
      .split(/[^a-z0-9]+/)
      .includes(code)
  )
    return null;
  const said = String(text || "");
  const m = fold(said).match(
    new RegExp(`(?<![a-z0-9])${[...code].join("[\\s.&'’-]*")}(?![a-z0-9])`),
  );
  const written = m
    ? said.slice(m.index ?? 0, (m.index ?? 0) + m[0].length)
    : "";
  return written && fold(written) === m?.[0] ? written : "";
}
// Written apart or with capitals inside ("Grafana Labs", "PerkinElmer").
const apart = (s: string): boolean =>
  /[\s.&'’-]/.test(s) || /[a-z].*[A-Z]/.test(s.slice(1));
// As people write a name: each word of two letters or more with a capital or a figure first, but the small words
// between them («Sterk in Matches»), and no word cut in two by a page's letters («T ransdev», «Abb ott», «Novar-tis»).
const SMALL_WORDS = new Set([
  "de",
  "del",
  "der",
  "den",
  "des",
  "du",
  "la",
  "le",
  "les",
  "van",
  "von",
  "in",
  "of",
  "and",
  "und",
  "y",
  "et",
  "el",
  "da",
  "di",
  "do",
  "&",
]);
const asName = (s: string): boolean =>
  !/\.\.|[a-z][-'’][a-z]/.test(s) &&
  s
    .split(/\s+/)
    .every(
      (w: string) =>
        SMALL_WORDS.has(w) ||
        (w.replace(/[^\p{L}\p{N}]/gu, "").length >= 2 &&
          /^[\p{Lu}\p{N}]/u.test(w)),
    );
// How an advert writes in small letters a name its board gives all in capitals ("Jackson Hogg" for «JACKSON HOGG»,
// «Plexus Santé» for «PLEXUS SANTÉ»): the same letters, apart or together, the first time it writes them with small
// ones and a capital first («le Paradis des Sources» inside a sentence is passed by); '' when it never does (MAW S.P.A.
// stays), null when the name is not all capitals or not all in Latin letters («ALPHA ΚΥΠΡΟΥ»).
function capsSpelling(name: string, text: unknown): string | null {
  const raw = String(name || "");
  const code = letters(raw);
  if (
    /\p{Ll}/u.test(raw) ||
    !/\p{Lu}{2}/u.test(raw) ||
    code.length < 5 ||
    [...raw].some((c) => /\p{L}/u.test(c) && !/\p{Script=Latin}/u.test(c))
  )
    return null;
  const said = String(text || "");
  const pattern = new RegExp(
    `(?<![a-z0-9])${[...code].join("[\\s.&'’-]*")}(?![a-z0-9])`,
    "g",
  );
  for (const m of fold(said).matchAll(pattern)) {
    const written = said.slice(m.index, m.index + m[0].length);
    if (
      fold(written) === m[0] &&
      /\p{Ll}/u.test(written) &&
      /^[\p{Lu}\p{N}]/u.test(written)
    )
      return written;
  }
  return "";
}
// For each name of a board copied from its address, the way most of its adverts write it: «ZEISS Group» for
// "Zeissgroup", every advert of the board alike. An advert that writes it together votes for the name as it stands
// ("Manpower", "Abbott" stay), and a way of writing needs two adverts, or the board's only one. One written all in
// capitals comes down ("REBOOT MONKEY"); so does a board's name given all in capitals that its adverts write
// otherwise («JACKSON HOGG» → "Jackson Hogg", the readers of every kind of offer, 6 November 2026).
export function writtenNames(
  adverts: Iterable<{
    readonly company?: string;
    readonly url?: string;
    readonly description?: string;
  }>,
): Map<string, string> {
  const votes = new Map<string, Map<string, number>>();
  for (const raw of adverts) {
    const name = String(raw?.company || "");
    const code = spelling(name, raw?.url, raw?.description);
    const written = code ?? capsSpelling(name, raw?.description);
    const vote = !written
      ? ""
      : code !== null && !apart(written)
        ? name
        : asName(written)
          ? written
          : "";
    if (!vote) continue;
    let tally = votes.get(name);
    if (!tally) votes.set(name, (tally = new Map()));
    tally.set(vote, (tally.get(vote) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const [name, v] of votes) {
    const [best = "", n = 0] = [...v].toSorted((a, b) => b[1] - a[1])[0] ?? [];
    const all = [...v.values()].reduce((a, b) => a + b, 0);
    if (best !== name && (n >= 2 || all === 1))
      out.set(name, /[a-z]/.test(best) ? best : calm(best));
  }
  return out;
}
