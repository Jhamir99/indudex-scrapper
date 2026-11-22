// Legacy builder/mt/language-of.ts (JustJans/indudex@b0cd182), with Argus v1.11.0's languageOfPlace
// (server-bot/notify.mjs); word for word but for lint and the data's reader.
// A title written in another language than its country's ("Pracownik produkcji" on a Dutch site, "Svářeč metodou
// TIG" on a German one): told by the letters only that language writes, so it goes to that language's Firefox model
// into English instead of being read as German. Measured on the 541,157 offers of the countries the translation
// reads (24 October): about 230 such titles, Polish the most.
// A French title on a Belgian offer the site files as Dutch ("Technicien de maintenance - 2 équipes", read as Dutch
// it came back "Technicians the maintenance"): told by a French letter or link word and words far commoner in French
// job titles than in Dutch ones (dict/vocab-*.json); 156 of the 43,175 known Dutch titles (25 October).
import { unaccent } from "../../shared/kit/fold.js";
import { vocab as dataVocab } from "./data.js";
const BY_LETTER: [string, RegExp][] = [
  ["cs", /[ěřůĚŘŮ]/u],
  ["pl", /[łŁ]|[ąęńśźżĄĘŃŚŹŻ].*[ąęńśźżĄĘŃŚŹŻ]/u],
  ["hu", /[őűŐŰ]/u],
  ["ro", /[șțȘȚ]|[ăĂ].*[ăĂ]/u],
  ["sk", /[ľĺŕĽĹŔ]/u],
];
type Vocab = Readonly<Record<string, number>>;
const vocab = (l: string): Vocab => dataVocab(l);
const FRENCH_LINK =
  /(?<![\p{L}])(?:du|des|la|le|les|pour|au|aux|et|d['’]|l['’]|à|avec|sur|chez|une?)(?![\p{L}])/iu;
const DUTCH_LINK =
  /(?<![\p{L}])(?:je|jouw|het|een|voor|met|bij|naar|van|zijn|wij|ons|uw|of)(?![\p{L}])/iu;
// Against German, on a Swiss or Luxembourg offer filed as German ("Chargé de projets industriels"), told the same way.
const GERMAN_LINK =
  /(?<![\p{L}])(?:und|für|mit|der|die|das|den|im|zur|zum|bei|als|auf|von|oder)(?![\p{L}])|[äöüß]/iu;
function french(t: string, against = "nl"): boolean {
  // Each part of a word joined with a hyphen read alone ("Programmeur-Régleur", "Monteur-Mécanique").
  const words = (t.match(/\p{L}[\p{L}'’]*/gu) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2);
  const fr = vocab("fr"),
    other = vocab(against),
    es = vocab("es"),
    en = vocab("en");
  // The English every language's titles borrow counts for neither side ("Développeur Front-End", "Soudeur semi-auto").
  const own = words.filter((w) => (en[w] || 0) < 20);
  if (!own.length) return false;
  // Without a French letter or link word too, when half its words are fifty times commoner in French titles and none
  // is commoner in the other language's ("Chauffagiste", "Dessinateur", "Conducteur de chantier", "Monteur de pneus"
  // were read as Dutch: "Xofagista", "Conductor el cantor", "Montador la nariz").
  if (
    !own.some((w) => (other[w] || 0) > 3 * (fr[w] || 0)) &&
    own.filter((w) => (fr[w] || 0) >= 20 && (fr[w] || 0) > 50 * (other[w] || 0))
      .length /
      own.length >=
      0.5
  )
    return true;
  if (
    (!/[éèêàçùûîô]/iu.test(t) && !FRENCH_LINK.test(t)) ||
    (against === "de" ? GERMAN_LINK : DUTCH_LINK).test(t)
  )
    return false;
  const frenchWords = own.filter(
    (w) =>
      (fr[w] || 0) >= 3 &&
      (fr[w] || 0) > 3 * (other[w] || 0) &&
      (fr[w] || 0) > (es[w] || 0),
  );
  return frenchWords.length / own.length >= 0.5;
}
// A Catalan title on an offer the site files as Spanish ("Muntador/a en fusteria metàl·lica i alumini"): told by a
// Catalan letter or link word and words far commoner in Catalan job titles than in Spanish ones.
const CATALAN_LINK =
  /(?<![\p{L}])(?:amb|per|els|dels|pels|i|al·l)(?![\p{L}])|l·l|[àèò]/iu;
const SPANISH_LINK =
  /(?<![\p{L}])(?:los|las|para|con|y|en el|en la)(?![\p{L}])/iu;
function catalan(t: string): boolean {
  if (SPANISH_LINK.test(t)) return false;
  const words = (t.match(/\p{L}[\p{L}'’·.-]*\p{L}|\p{L}/gu) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2);
  if (!words.length) return false;
  const ca = vocab("ca"),
    es = vocab("es");
  // A Catalan letter or link word, or a word only Catalan titles use ("muntador", "producció", "enginyer").
  if (
    !CATALAN_LINK.test(t) &&
    !words.some((w) => (ca[w] || 0) >= 10 && (es[w] || 0) <= 1)
  )
    return false;
  return (
    words.filter((w) => (ca[w] || 0) >= 3 && (ca[w] || 0) > 3 * (es[w] || 0))
      .length /
      words.length >=
    0.5
  );
}
// And a Spanish title on an offer filed as Catalan, in Catalonia («Técnico/a de Gas y Calderas en Lleida», «Operario/a de
// Mantenimiento Hotel - Sant Cugat»): told the same way the other way round, by a Spanish link word or a word only Spanish
// titles use, and words far commoner in Spanish job titles than in Catalan ones. Without it a title the words did not
// settle was taken for Catalan, never translated, and shown in Spanish on the Catalan page: 216 published titles, almost
// all offers in Catalonia (the checker of every published title, 9 November 2026).
function spanish(t: string): boolean {
  if (CATALAN_LINK.test(t)) return false;
  const words = (t.match(/\p{L}[\p{L}'’·.-]*\p{L}|\p{L}/gu) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2);
  const ca = vocab("ca"),
    es = vocab("es");
  // Only words the job titles use (fifty times between the two lists): a town («Sant Cugat») is no sign of either.
  const known = words.filter((w) => (es[w] || 0) + (ca[w] || 0) >= 50);
  if (!known.length) return false;
  // A Spanish link word, or a word a hundred times commoner in Spanish titles («operario», «mantenimiento», «técnico»,
  // «jefe»: the Catalan list holds a few Spanish titles filed as Catalan, so not «never» as for Catalan above).
  if (
    !SPANISH_LINK.test(t) &&
    !known.some((w) => (es[w] || 0) >= 50 && (es[w] || 0) > 100 * (ca[w] || 0))
  )
    return false;
  return (
    known.filter((w) => (es[w] || 0) >= 3 && (es[w] || 0) > 3 * (ca[w] || 0))
      .length /
      known.length >=
    0.5
  );
}
// country: the offer's, when it has French as well as the language filed (Switzerland and Luxembourg, filed as German).
export function languageOf(
  title: unknown,
  filed = "",
  country = "",
): string | null {
  const t = String(title || "");
  for (const [lang, re] of BY_LETTER) if (re.test(t)) return lang;
  if (filed === "nl" && french(t)) return "fr";
  if (
    filed === "de" &&
    (country === "ch" || country === "lu") &&
    french(t, "de")
  )
    return "fr";
  if (filed === "es" && catalan(t)) return "ca";
  if (filed === "ca" && spanish(t)) return "es";
  return null;
}
// A title whose offer's country names no language (an offer for several countries): English where every word of
// three letters or more is one English job titles use three times or more (`least`) and none needs a letter English
// lacks.
export function englishTitle(title: unknown, least = 3): boolean {
  const words = (String(title || "").match(/\p{L}+/gu) || [])
    .filter((w) => w.length > 2)
    .map((w) => w.toLowerCase());
  if (!words.length || words.some((w) => /[^a-z]/.test(w))) return false;
  const en = vocab("en");
  return words.every((w) => (en[w] || 0) >= least);
}
// Whether a title reads as written in `lang` rather than in English: more of its words are five times as frequent in
// that language's job titles as in English ones (each list's size accounted for) than three times rarer. Titles in
// every language borrow English job words ("Senior", "Engineer"), and the offer's country alone took "Confidential
// Computing & Virtualization Senior Engineer" for Spanish (5 November 2026); "Werktuigbouwkundig Engineer" reads as
// Dutch, and a name a market favours ("Symfony", four times as frequent in German titles) is no sign of German, nor
// is a word in capitals ("SAP Integration Consultant").
const SIZE: Record<string, number> = {};
const size = (l: string): number =>
  (SIZE[l] ??= Object.values(vocab(l)).reduce((n, c) => n + c, 0));
export function readsAs(title: unknown, lang: string): boolean {
  const own = vocab(lang),
    en = vocab("en");
  let mine = 0,
    english = 0;
  for (const w of (String(title || "").match(/\p{L}+/gu) || [])
    .filter((word) => word.length > 2 && word !== word.toUpperCase())
    .map((word) => word.toLowerCase())) {
    const ratio =
      ((own[w] || 0) + 0.5) / size(lang) / (((en[w] || 0) + 0.5) / size("en"));
    if ((own[w] || 0) >= 3 && ratio >= 5) mine++;
    else if ((en[w] || 0) >= 3 && ratio <= 1 / 3) english++;
  }
  return mine > english;
}

// A title written in English only, among `lang`'s titles: every word one English titles use three times or more
// (englishTitle), none of `lang`'s own (five times as frequent in its titles as in English ones), and no link word of it
// («Desarrollador/a Power BI», «Java Full-Stack Developer – Java, Spring Boot y React» are Spanish titles; "Manufacturing
// Engineer" on a Spanish offer is English: 7,162 of Spain's published offers showed one untranslated, 8 November 2026).
const LINKS: Record<string, RegExp> = {
  es: /(?<![\p{L}])(?:y|de|del|para|con|en|los|las|el|la)(?![\p{L}])/iu,
};
export function englishOnly(title: unknown, lang: string): boolean {
  if (
    !englishTitle(title, 3) ||
    (LINKS[lang] && LINKS[lang].test(String(title)))
  )
    return false;
  const own = vocab(lang),
    en = vocab("en");
  return !(String(title || "").match(/\p{L}+/gu) || [])
    .filter((w) => w.length > 2)
    .map((w) => w.toLowerCase())
    .some(
      (w) =>
        (own[w] || 0) >= 3 &&
        ((own[w] || 0) + 0.5) /
          size(lang) /
          (((en[w] || 0) + 0.5) / size("en")) >=
          5,
    );
}

// The language a place names (Argus's languageOfPlace).
// Which language a job title in a given country is written in — a second attempt only,
// when automatic detection has given up. Written WITHOUT accents and matched against
// folded text: JavaScript's word boundary only knows ASCII, so an accented name like
// "België" has no boundary to find; folding both sides also makes "Espana" and "España"
// the same word, and the boards spell it both ways.
const COUNTRY_LANG: readonly (readonly [RegExp, string])[] = [
  [/\bfrance\b|\bfrancia\b|\bfrankrijk\b|\bmonaco\b|\.fr[/?]|\.fr$/i, "fr"],
  [/\bspain\b|\bespana\b|\bspanje\b|\bspanien\b|\.es[/?]|\.es$/i, "es"],
  [
    /\bgermany\b|\bdeutschland\b|\balemania\b|\bduitsland\b|\.de[/?]|\.de$/i,
    "de",
  ],
  [
    /\bnetherlands\b|\bnederland\b|\bholanda\b|\bpaises bajos\b|\.nl[/?]|\.nl$/i,
    "nl",
  ],
  [/\bbelgium\b|\bbelgie\b|\bbelgique\b|\bbelgica\b|\.be[/?]|\.be$/i, "nl"],
  [/\bitaly\b|\bitalia\b|\.it[/?]|\.it$/i, "it"],
  [/\bportugal\b|\.pt[/?]|\.pt$/i, "pt"],
];
export const languageOfPlace = (place: string): string =>
  (COUNTRY_LANG.find(([re]) => re.test(unaccent(place))) || [])[1] || "";
