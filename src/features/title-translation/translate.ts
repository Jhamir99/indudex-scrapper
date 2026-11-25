import { fold } from "../../shared/kit/fold.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import {
  englishOnly,
  englishTitle,
  languageOfPlace,
  languageOf as writtenIn,
} from "./language-of.js";
import {
  apostrophes,
  besideTowns,
  catalanSpelling,
} from "./method/catalan-spelling.js";
import { MARKED, withMarks } from "./method/marks.js";
import { otherNames, townsBack } from "./method/places.js";
import { languagesOfCountry } from "../../shared/words/country-languages.js";

// Titles in the site's six languages, from caches the site's own translator fills (legacy
// builder/translate.mjs, word for word but for types). A title is translated once, ever: each
// language's cache is keyed by the title alone, so the same role in fifty towns is one translation,
// and a title that needs none is remembered as such (NOTHING, ""). A build applies what the caches
// hold and writes down what they lack (wantedTitles). Each language travels in its own field next
// to the original `t`, only when it differs from it (save Catalan: below). A source whose terms ask
// that what it publishes is not altered keeps its titles as written, marked with their language (`nt`).

// The site's languages and the field of each (the legacy web's app/lib/site.ts).
export const LANGUAGES = ["en", "es", "ca", "fr", "nl", "de"] as const;
export type Language = (typeof LANGUAGES)[number];
export const TITLE_FIELD = {
  en: "te",
  es: "ts",
  ca: "tc",
  fr: "tf",
  nl: "tn",
  de: "td",
} as const;
// Languages translated ahead of their pages (empty, as in the legacy).
export const COMING: readonly string[] = [];

export { languagesOfCountry };

type Titled = Offer & Record<string, unknown>;

// The language a title is written in: what the source said, else what the place or the offer's country says, unless
// its letters and words say another (builder/mt/language-of.ts: Polish on a Dutch site, French on a Belgian offer
// filed as Dutch, Catalan on a Spanish one); with neither, English where every word is one English titles use; else
// ''. The country, as Firefox weighs a page's declared language: the place alone left 83,320 published offers whose
// place names no country with no language, so never translated (31 October 2026).
const known = new WeakMap<object, string>();
// A town as a word of its own; in the title as the offer writes it ("Java oder JavaScript" names no Oder).
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// Towns that are link words of the titles too (Frankfurt (Oder) read as "Oder": «Java Oder JavaScript»).
const LINK_WORDS = new Set([
  "oder",
  "und",
  "and",
  "or",
  "et",
  "ou",
  "en",
  "den",
  "der",
  "van",
  "aan",
]);
const asWord = (w: string, flags = "iu") =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w)}(?![\\p{L}\\p{N}])`, flags);
// A Spanish offer's title written in English («Manufacturing Engineer», "Senior Civil Engineer"): every word one English
// titles use three times or more, none a Spanish title's own nor a Spanish link word. Filed as Spanish by its country, it got no
// Spanish title: 6,694 of Spain's 19,876 published offers showed it in English on the Spanish page (8 November 2026).
const englishOnSpanish = (t: string) => englishOnly(t, "es");
export function languageOf(rec: Pick<Offer, "t" | "tl" | "l" | "cc">): string {
  const was = known.get(rec);
  if (was !== undefined) return was;
  const filed =
    rec.tl ||
    languageOfPlace(rec.l || "") ||
    languagesOfCountry(rec.cc)[0] ||
    "";
  const lang =
    writtenIn(rec.t, filed, rec.cc) ||
    (filed === "es" && englishOnSpanish(rec.t) ? "en" : "") ||
    filed ||
    (englishTitle(rec.t) ? "en" : "");
  known.set(rec, lang);
  return lang;
}

// Each record's title in `target` from the cache, where the title is in another language and its source lets it
// be translated. A record of a source that does not is marked with its title's language instead (`nt`). A title
// written in Catalan is its own Catalan title: the Catalan page shows the Spanish one where there is no Catalan
// (app/lib/i18n.ts), and showed 253 offers written in Catalan in Spanish (5 November 2026).
export function applyTitles(
  records: Titled[],
  {
    target,
    cache,
    untranslated = new Set<string>(),
  }: {
    target: Language;
    cache: ReadonlyMap<string, string>;
    untranslated?: ReadonlySet<string>;
  },
): { translated: number; kept: number } {
  const field = TITLE_FIELD[target];
  let translated = 0,
    kept = 0;
  for (const rec of records) {
    if (rec.t && target === "ca" && languageOf(rec) === "ca") rec.tc = rec.t;
    if (!rec.t || languageOf(rec) === target) continue;
    if (untranslated.has(rec.s)) {
      const lang = languageOf(rec);
      if (lang) rec.nt = lang;
      kept++;
      continue;
    }
    const out = cache.get(rec.t);
    // A Catalan title with today's apostrophes and contractions (builder/mt/catalan-spelling.ts), the cache holding
    // older ones («Mecànic d'taller», «per a el nostre»: 454 of 563,905 cached titles, 8 November 2026).
    if (out && fold(out) !== fold(rec.t)) {
      const town = String(rec.ci || "").trim();
      let shown =
        target === "ca" ? besideTowns(out, [town], catalanSpelling) : out;
      // A Spanish or Catalan title's gender marks, given back to its translation into the other («Ingeniero/a de procesos»
      // → «Enginyer/a de processos»): the method writes it in the masculine (builder/mt/marks.ts).
      const lang = languageOf(rec);
      if (
        (target === "es" || target === "ca") &&
        (lang === "es" || lang === "ca") &&
        MARKED.test(rec.t) &&
        !MARKED.test(shown)
      )
        shown = withMarks(shown, target);
      // The offer's own town as the title writes it, where the translation renamed it (Berlin → «Berlín», Paris → «París»,
      // Stockholm → «Estocolmo»): towns are not translated (the owner's rule). The method writes back only the towns it
      // finds after «in», «à»… or closing a part (builder/mt/places.ts): 1,894 Spanish and 1,853 Catalan titles of 8
      // November 2026 named their offer's town otherwise. Only a town of the list of places, with other names: a place read
      // from the title's own words («(C# oder Java)») is none.
      if (
        town.length > 2 &&
        /^\p{Lu}/u.test(town) &&
        !LINK_WORDS.has(town.toLowerCase()) &&
        asWord(town, "u").test(rec.t) &&
        !asWord(town).test(shown)
      ) {
        // And first the Catalan spelling an older cache gave the town («Torrejón d'Ardoz», «Mairena de l'Aljarafe»: TB2-10),
        // before its other names («Aljarafe»), which would write the town a second time.
        const respelled =
          target === "ca"
            ? [apostrophes(catalanSpelling(town))].filter((o) => o !== town)
            : [];
        const others = [...respelled, ...otherNames(town)];
        if (others.length) shown = townsBack(shown, { [town]: others });
      }
      rec[field] = shown;
      translated++;
    }
  }
  return { translated, kept };
}

// The titles the caches lack, each once: its language, the languages it lacks, and what the method reads beside it
// (the commonest town and company of its offers, and how many other companies' titles hold every word of that
// company's name: a name that common is a job or a field, not a company). Its offers and its commonest country
// order the translator's work: Spain's first, then the most offered. A title to translate anew (`redo`) is asked for
// in every language while its old translations still show, after the titles no cache holds yet.
// The value most often given.
const commonest = (m: Map<string, number>) =>
  [...m].toSorted((a, b) => b[1] - a[1])[0]?.[0] || "";

// A text's words of two letters or more, in small letters.
const words = (s: unknown) =>
  String(s || "")
    .toLowerCase()
    .match(/\p{L}{2,}/gu) || [];

export interface WantedTitle {
  t: string;
  lang: string;
  into: string[];
  n: number;
  cc: string;
  ci: string;
  c: string;
  redo?: 1;
  others?: number;
}

export function wantedTitles(
  records: readonly Offer[],
  caches: Readonly<Record<string, ReadonlyMap<string, string> | undefined>>,
  {
    untranslated = new Set<string>(),
    redo = new Set<string>(),
    coming = COMING,
  }: {
    untranslated?: ReadonlySet<string>;
    redo?: ReadonlySet<string>;
    coming?: readonly string[];
  } = {},
): WantedTitle[] {
  const by = new Map<
    string,
    {
      t: string;
      lang: string;
      into: Set<string>;
      n: number;
      cc: Map<string, number>;
      ci: Map<string, number>;
      c: Map<string, number>;
    }
  >();
  for (const rec of records) {
    if (!rec.t || untranslated.has(rec.s)) continue;
    const lang = languageOf(rec);
    if (!lang) continue;
    const into = [...new Set([...LANGUAGES, ...coming])].filter(
      (t) => t !== lang && (redo.has(rec.t) || !caches[t]?.has(rec.t)),
    );
    if (!into.length) continue;
    let w = by.get(rec.t);
    if (!w)
      by.set(
        rec.t,
        (w = {
          t: rec.t,
          lang,
          into: new Set(),
          n: 0,
          cc: new Map(),
          ci: new Map(),
          c: new Map(),
        }),
      );
    for (const t of into) w.into.add(t);
    w.n++;
    for (const [k, v] of [
      ["cc", rec.cc],
      ["ci", rec.ci],
      ["c", rec.c],
    ] as const)
      w[k].set(v || "", (w[k].get(v || "") || 0) + 1);
  }
  const wanted: WantedTitle[] = [...by.values()].map((w) => ({
    t: w.t,
    lang: w.lang,
    into: [...w.into],
    n: w.n,
    cc: commonest(w.cc),
    ci: commonest(w.ci),
    c: commonest(w.c),
    ...(redo.has(w.t) ? { redo: 1 as const } : {}),
  }));
  // How many other companies' titles hold every word of each wanted company's name, in one pass over the records:
  // each name looked for under its first word.
  const names = new Map<string, { words: string[]; others: Set<string> }>();
  for (const w of wanted)
    if (w.c && !names.has(w.c))
      names.set(w.c, { words: [...new Set(words(w.c))], others: new Set() });
  const byFirst = new Map<string, string[]>();
  for (const [c, x] of names)
    if (x.words.length) {
      const k = x.words[0];
      if (!byFirst.has(k)) byFirst.set(k, []);
      byFirst.get(k)?.push(c);
    }
  for (const rec of records) {
    const ws = new Set(words(rec.t));
    for (const k of ws)
      for (const c of byFirst.get(k) || []) {
        const x = names.get(c);
        if (x && rec.c !== c && x.words.every((v) => ws.has(v)))
          x.others.add(rec.c || "");
      }
  }
  for (const w of wanted)
    w.others = w.c ? (names.get(w.c)?.others.size ?? 0) : 0;
  // A title only the coming languages lack waits for every other: the site's own languages are what visitors read.
  const comingOnly = (w: WantedTitle) =>
    w.into.every((t) => coming.includes(t)) ? 1 : 0;
  return wanted.toSorted(
    (a, b) =>
      comingOnly(a) - comingOnly(b) ||
      (a.redo || 0) - (b.redo || 0) ||
      (a.cc === "es" ? 0 : 1) - (b.cc === "es" ? 0 : 1) ||
      b.n - a.n,
  );
}
