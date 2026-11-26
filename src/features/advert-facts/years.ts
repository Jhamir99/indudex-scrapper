// ➤ The years of experience an advert asks for (docs/research/years-asked.md). Each sentence that names years is read on
// ➤ its own, in four steps:
// ➤   1. normalise: written in the words the requirement reader (argus/server-bot/requirements.mjs) knows;
// ➤   2. set aside what is not asked of the candidate: the company's own years, an age, a wish about something else;
// ➤   3. read: the requirement reader, then the same with the heading above, then this module's own patterns;
// ➤   4. keep 1 to 15 years: more is a company's history read as a demand.
// ➤ The advert asks the largest figure its sentences ask (the card) and the smallest (the filter).
// The legacy's builder/years.ts, copied (legacy resync T003): only its imports changed. Its own comments keep their marks.
import { extractRequiredYears } from "./argus/requirements.js";
import { ABBREVIATIONS, sentences } from "../../shared/kit/sentences.js";
import {
  LANGUAGES,
  READ_BY_BOT,
  anyOf,
  deniedDemand,
  numbers,
  phrases,
  words,
} from "../../shared/words/index.js";

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const alternation = (concept: string) => anyOf(words(concept, { bare: true }));
const YEAR_WORDS = words("year", { bare: true });
// ➤ The requirement reader knows the years of its six languages; the others' are written in English for it.
const KNOWN_YEAR = /^(?:years?|yrs?|años?|anys|ans?|jahren?|jaar|jaren)$/;
const ANY_YEAR = anyOf(YEAR_WORDS);
const YEAR = anyOf(YEAR_WORDS.filter((w) => KNOWN_YEAR.test(w)));
const OTHER_YEAR = anyOf(YEAR_WORDS.filter((w) => !KNOWN_YEAR.test(w)));
const OTHER_EXPERIENCE = anyOf(
  words("experience", {
    langs: LANGUAGES.filter((l) => !READ_BY_BOT.includes(l)),
  }),
);
const MINIMUM = anyOf(words("atLeast"));
// ➤ Numbers in words: from two («un», «ein» are articles too), and any in a range.
const WORD_NUMBER = numbers({ least: 2 });
const RANGE_NUMBER = numbers();
const RANGE_WORD = anyOf(Object.keys(RANGE_NUMBER));
const asNumber = (w: string) =>
  /\d/.test(w) ? w : String(RANGE_NUMBER[w.toLowerCase()]);

// ── Patterns ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const word = (body: string, flags = "giu") =>
  new RegExp(`(?<![\\p{L}])(?:${body})(?![\\p{L}])`, flags);
const OTHER_EXPERIENCE_WORD = word(OTHER_EXPERIENCE);
// ➤ «or more» may come between («three or more years», «drei oder mehr Jahre»).
const OR_MORE = `(?:\\+|${alternation("orMore")})`;
const FOLLOWED_BY_YEARS = `(?=\\s*${OR_MORE}?\\s*${ANY_YEAR}(?![\\p{L}]))`;
const NUMBER_YEARS = new RegExp(`\\d{1,2}\\s*\\+?\\s*${YEAR}\\b`, "i");

// ── 1. Normalise ─────────────────────────────────────────────────────────────────────────────────────────────────────
const EXPERIENCE = anyOf(words("experience"));
// ➤ Years written as an adjective before experience («3-jährige Berufserfahrung», «3-letnie doświadczenie», «3-årig
// ➤ erfarenhet», «3 éves tapasztalat», «3-ročná prax»), not an apprenticeship's length («3-jährige Ausbildung»).
const YEAR_ADJECTIVE = anyOf(words("yearAdjective"));
const FIGURE_YEARS = new RegExp(
  `(?<![\\p{L}\\d])(\\d{1,2})\\s*-?\\s*${YEAR_ADJECTIVE}(?![\\p{L}])(?=(?:\\s+\\p{L}+)?\\s+\\p{L}*${EXPERIENCE})`,
  "giu",
);
// ➤ Italian writes them as an adjective after experience («esperienza minima triennale»), not of a degree («laurea
// ➤ triennale»); Polish in words before it («dwuletnie doświadczenie», not «roczne wynagrodzenie»). One to five: ten or
// ➤ more is a company's («forte di un'esperienza decennale»).
const ITALIAN_YEAR_STEMS = [
  "annual",
  "biennal",
  "triennal",
  "quadriennal",
  "quinquennal",
];
const POLISH_YEAR_STEMS = [
  "roczn",
  "dwulet",
  "trzylet",
  "czteroletn",
  "pi[eę]cioletn",
];
const yearsOf = (stems: string[], stem: string) =>
  `${stems.findIndex((s) => new RegExp(`^${s}$`, "iu").test(stem)) + 1} years`;
const ITALIAN_YEARS = new RegExp(
  `(?<![\\p{L}])(${ITALIAN_YEAR_STEMS.join("|")})[ei](?![\\p{L}])`,
  "giu",
);
const POLISH_YEARS_IN_WORDS = new RegExp(
  `(?<![\\p{L}])(${POLISH_YEAR_STEMS.join("|")})\\p{L}*(?=\\s+do[sś]wiadcz)`,
  "giu",
);
// ➤ German too in words, also only before experience («zweijährige Erfahrung»).
const GERMAN_YEAR_STEMS = ["ein", "zwei", "drei", "vier", "f(?:ü|ue)nf"];
const GERMAN_YEARS = new RegExp(
  `(?<![\\p{L}\\d])(${GERMAN_YEAR_STEMS.join("|")})j(?:ä|ae|a)hrig\\p{L}*(?=(?:\\s+\\p{L}+)?\\s+\\p{L}*${EXPERIENCE})`,
  "giu",
);
const AFTER_EXPERIENCE = new RegExp(
  `${EXPERIENCE}(?:\\s+\\p{L}+){0,2}\\s+$`,
  "iu",
);
const italianYears = (
  adjective: string,
  stem: string,
  at: number,
  s: string,
) =>
  AFTER_EXPERIENCE.test(s.slice(Math.max(0, at - 60), at))
    ? yearsOf(ITALIAN_YEAR_STEMS, stem)
    : adjective;
const AGE = new RegExp(
  `(?<![\\p{L}\\d])\\d{1,2}\\s*\\+?\\s*${ANY_YEAR}\\s+${alternation("ageAfterYears")}(?![\\p{L}])`,
  "giu",
);
const RECENT = word(phrases("recentYears"));
// ➤ A range in figures or words, joined in any language («drei bis fünf Jahre», «tra 3 e 5 anni», «2/3 anni»): «N to
// ➤ M». A slash before a two is half a year («1/2 Jahr»).
const RANGE = new RegExp(
  `(?<![\\p{L}])(${RANGE_WORD}|\\d{1,2})\\s*(?:-|–|\\/(?!\\s*2\\b)|${alternation("rangeJoin")})\\s*(${RANGE_WORD}|\\d{1,2})${FOLLOWED_BY_YEARS}`,
  "giu",
);
// ➤ A number in words with its figure after it in brackets ("Two (2) years") is the figure.
const WORDS_THEN_FIGURE = new RegExp(
  `(?<![\\p{L}])${RANGE_WORD}\\s*\\((\\d{1,2})\\)`,
  "giu",
);
// ➤ Not the last part of a hyphenated number («twenty-five years» is no five).
const YEARS_IN_WORDS = new RegExp(
  `(?<![\\p{L}-])(${anyOf(Object.keys(WORD_NUMBER))})${FOLLOWED_BY_YEARS}`,
  "giu",
);
// ➤ Numbers that alone are other words, only before a year of their own language: Danish «to års erfaring», not "thanks
// ➤ to years of experience".
const NUMBER_BEFORE_YEAR = numbers({ concept: "numbersBeforeYear" });
const beforeOwnYear = (lang: string) => {
  const own = Object.keys(
    numbers({ concept: "numbersBeforeYear", langs: [lang] }),
  );
  return own.length
    ? [
        `(?:${anyOf(own)})(?=\\s*(?:${anyOf(words("year", { langs: [lang] }))})s?(?![\\p{L}]))`,
      ]
    : [];
};
const YEARS_IN_OWN_WORDS = new RegExp(
  `(?<![\\p{L}-])(?:${LANGUAGES.flatMap(beforeOwnYear).join("|")})`,
  "giu",
);
// ➤ «Un», «one», «ein» are articles too: a one only right after a minimum («al menos un año»), and a year whose word is
// ➤ another language's too only so («mínima d'un any»), written in English for the requirement reader.
const ONE = anyOf(
  Object.keys(RANGE_NUMBER).filter((w) => RANGE_NUMBER[w] === 1),
);
const MINIMUM_ONE = new RegExp(
  `(?<![\\p{L}])(${MINIMUM})\\s*${ONE}${FOLLOWED_BY_YEARS}`,
  "giu",
);
const MINIMUM_ONE_YEAR = new RegExp(
  `(?<![\\p{L}])(${MINIMUM})\\s*(?:${phrases("oneYear")}|${phrases("yearAfterMinimum")})(?![\\p{L}])`,
  "giu",
);
// ➤ So is a one right before a year of experience or after experience «of» («Un año de experiencia», "One year of
// ➤ experience", «Experiencia previa de un año»), not a year of something else («un año de contrato»).
const ONE_OF_EXPERIENCE = new RegExp(
  `(?<![\\p{L}])${ONE}(?=\\s*${ANY_YEAR}\\s+(?:of|de|d['’]|di|van)?\\s*${EXPERIENCE})` +
    `|(?<=${EXPERIENCE}(?:\\s+\\p{L}+)?\\s+(?:(?:of|de|di|van)\\s+|d['’]))${ONE}${FOLLOWED_BY_YEARS}`,
  "giu",
);
// ➤ Catalan's one year, whose word is English «any» too, likewise beside experience («Experiència prèvia d'un any»,
// ➤ «Experiència: 1 any», «Un any d'experiència»).
const ONE_YEAR = new RegExp(
  `(?<![\\p{L}\\d])${phrases("oneYear")}(?![\\p{L}])`,
  "giu",
);
const EXPERIENCE_BEFORE = new RegExp(
  `${EXPERIENCE}(?:\\s+\\p{L}+)?(?:\\s*:|\\s+(?:of|de|di|van))?\\s*(?:d['’])?\\s*$`,
  "iu",
);
const EXPERIENCE_AFTER = new RegExp(
  `^\\s+(?:of|de|di|van|d['’])?\\s*${EXPERIENCE}`,
  "iu",
);
const oneYearOfExperience = (phrase: string, at: number, s: string) =>
  EXPERIENCE_BEFORE.test(s.slice(Math.max(0, at - 60), at)) ||
  EXPERIENCE_AFTER.test(s.slice(at + phrase.length))
    ? "1 years"
    : phrase;
// ➤ «More than N» asks N.
const MORE_THAN = new RegExp(
  `${word(anyOf(words("moreThan"))).source}\\s+(\\d{1,2})${FOLLOWED_BY_YEARS}`,
  "giu",
);
const OTHER_LANGUAGE_YEARS = new RegExp(
  `(?<![\\p{L}\\d])(\\d{1,2})(\\s*(?:[-–—]\\s*\\d{1,2}\\s*)?)(${OR_MORE}\\s*)?${OTHER_YEAR}(?![\\p{L}])`,
  "giu",
);
// ➤ «Less than N» is a ceiling, but not «au moins de», «al menos de».
const CEILING = new RegExp(
  `(?<![\\p{L}])(?<!\\b(?:al|au|pelo|ao)\\s)(?:<|≤|${anyOf(words("lessThan"))})(?=\\s+\\d)`,
  "giu",
);
// ➤ A field of business work («5 years in business development») is not a company's years «in business», which the
// ➤ requirement reader and the tables leave out.
const BUSINESS_FIELD =
  /(?<![\p{L}])business(?=[\s-]+(?:development|analys|intelligence|operations|administration|management|process|partner|consult|controlling|application|system|unit|transformation))/giu;
const normalised = (s: string) =>
  s
    .replace(BUSINESS_FIELD, "commercial")
    .replace(FIGURE_YEARS, "$1 years")
    .replace(ITALIAN_YEARS, italianYears)
    .replace(POLISH_YEARS_IN_WORDS, (_, stem: string) =>
      yearsOf(POLISH_YEAR_STEMS, stem),
    )
    .replace(GERMAN_YEARS, (_, stem: string) =>
      yearsOf(GERMAN_YEAR_STEMS, stem),
    )
    .replace(AGE, " ")
    .replace(RECENT, " ")
    .replace(WORDS_THEN_FIGURE, "$1")
    .replace(
      RANGE,
      (m, a: string, b: string) => `${asNumber(a)} to ${asNumber(b)}`,
    )
    .replace(MINIMUM_ONE, "$1 1")
    .replace(MINIMUM_ONE_YEAR, "$1 1 years")
    .replace(ONE_OF_EXPERIENCE, "1")
    .replace(ONE_YEAR, oneYearOfExperience)
    .replace(YEARS_IN_WORDS, (w: string) =>
      String(WORD_NUMBER[w.toLowerCase()]),
    )
    .replace(YEARS_IN_OWN_WORDS, (w: string) =>
      String(NUMBER_BEFORE_YEAR[w.toLowerCase()]),
    )
    .replace(MORE_THAN, "$1+")
    .replace(
      OTHER_LANGUAGE_YEARS,
      (_, n: string, range: string, more?: string) =>
        `${n}${range}${more ? "+" : ""}years`,
    )
    .replace(OTHER_EXPERIENCE_WORD, "experience")
    .replace(CEILING, "up to");

// ── 2. What is not asked of the candidate ────────────────────────────────────────────────────────────────────────────
// ➤ The company's own years: a sentence that opens with them («Mit über 15 Jahren Erfahrung bieten wir…»), or one whose
// ➤ subject is the company («Somos una empresa con más de 10 años de experiencia»), two years or more, before any verb
// ➤ of seeking someone («Empresa del sector busca técnico con 5 años» asks the five).
const SEEK = anyOf(words("seek"));
const COMPANY_OPENS = new RegExp(
  `^\\s*${alternation("companyBoast")}\\s+(?:[2-9]|[1-9]\\d)\\s+${ANY_YEAR}`,
  "iu",
);
// ➤ In the languages of the company's words only: Swedish «som» is «who».
const COMPANY_YEAR = anyOf(
  words("year", {
    langs: ["es", "ca", "en", "fr", "de", "nl", "it"],
    bare: true,
  }),
);
const COMPANY_SUBJECT = new RegExp(
  `${word(alternation("weTheCompany")).source}(?:(?!${SEEK})[^.]){0,80}?(?<!\\d)(?:[2-9]|[1-9]\\d)\\s+${COMPANY_YEAR}(?![\\p{L}])`,
  "iu",
);
// ➤ Or years the company says back it («Más de 10 años de experiencia en el sector nos avalan»).
const COMPANY_BACKED = new RegExp(
  `(?<!\\d)(?:[2-9]|[1-9]\\d)\\s+${COMPANY_YEAR}(?![\\p{L}])[^.]{0,80}?${word(alternation("companyHistory")).source}`,
  "iu",
);
const TO_THE_CANDIDATE = word(alternation("you"), "iu");
const UP_TO_SEEKING = new RegExp(`^(?:(?!${SEEK})[^,;])*`, "iu");
const companysYears = (s: string) =>
  [COMPANY_OPENS, COMPANY_SUBJECT, COMPANY_BACKED].some((re) => re.test(s)) &&
  !TO_THE_CANDIDATE.test(s);
// ➤ The sentence without them, what it asks after the next comma or verb of seeking kept («Amb més de 20 anys
// ➤ d'experiència, busquem tècnic amb 2 anys»).
function withoutCompanysYears(s: string) {
  for (const re of [COMPANY_OPENS, COMPANY_SUBJECT, COMPANY_BACKED]) {
    const m = s.match(re);
    if (m)
      s =
        s.slice(0, m.index) +
        s.slice((m.index ?? 0) + m[0].length).replace(UP_TO_SEEKING, "");
  }
  return s;
}
// ➤ What a requirement includes after its total ("8+ years of product management, including 3+ years managing PMs"):
// ➤ cut off when the total comes first.
const INCLUDING = new RegExp(
  `,?\\s+${alternation("including")}(?![\\p{L}])`,
  "iu",
);
// ➤ A wish after the years about something else ("5 years of experience, ideally within the automotive industry", "3+
// ➤ years in finance, markets background preferred", «5 Jahre Erfahrung im Softwaretest und idealerweise
// ➤ ISTQB-Kenntnisse»): cut off at a comma before the clause that holds it, after a dash or «and», or before «in»,
// ➤ «within», or once the years' experience word is said ("5–8 years' senior EHS experience within the construction
// ➤ industry ideally electrical"); «5 years, preferably 7» keeps its wish on the years.
const PREFERABLY = alternation("preferably");
const DENIED = deniedDemand(
  alternation("no"),
  alternation("required"),
  "[\\p{L}\\d]",
);
const WISH = `${alternation("wish")}|${PREFERABLY}|${DENIED}`;
const EXPERIENCE_WORD = anyOf(words("experience", { bare: true }));
const WISH_AFTER = new RegExp(
  `\\s*[,;]\\s*(?=[^,;]*?(?<![\\p{L}])(?:${WISH})(?![\\p{L}]))|\\s*(?:[–—-]|\\s${alternation("and")})\\s*${PREFERABLY}(?![\\p{L}])|\\s+${PREFERABLY}\\s+(?:in|within|im|in der|en|dans|bei|op|nel|nella|w)(?![\\p{L}])`,
  "iu",
);
// ➤ «5 years of experience preferably in…»: the wish after the years and an experience word in the same clause. Found
// ➤ clause by clause, each pattern read once: a look back from every wish word read the clause again each time, so a
// ➤ 94 KB picture held the publication for hours (17 November 2026), and hundreds of wishes still took seconds.
const YEARS_FIGURE = new RegExp(`\\d\\s*\\+?\\s*${YEAR}`, "iu");
const EXPERIENCE_ALONE = new RegExp(
  `(?<![\\p{L}])${EXPERIENCE_WORD}(?![\\p{L}])`,
  "iu",
);
const WISH_BEFORE_WORDS = new RegExp(`\\s+${PREFERABLY}(?=\\s+\\p{L})`, "iu");
const after = (s: string, re: RegExp, from: number) => {
  const m = re.exec(s.slice(from));
  return m ? { at: from + m.index, end: from + m.index + m[0].length } : null;
};
function wishAfterExperience(s: string): number {
  let start = 0;
  for (const clause of s.split(/[,;]/)) {
    const years = after(clause, YEARS_FIGURE, 0);
    const experience = years && after(clause, EXPERIENCE_ALONE, years.end);
    const wish = experience && after(clause, WISH_BEFORE_WORDS, experience.end);
    if (wish) return start + wish.at;
    start += clause.length + 1;
  }
  return -1;
}
const wishAt = (s: string) => {
  const found = [s.search(WISH_AFTER), wishAfterExperience(s)].filter(
    (at) => at >= 0,
  );
  return found.length ? Math.min(...found) : -1;
};
const cutAt = (s: string, at: number) =>
  at >= 0 && NUMBER_YEARS.test(s.slice(0, at)) ? s.slice(0, at) : s;
// ➤ An aside in brackets that softens something else ("10+ years (MS preferred)") goes; one that holds the years stays
// ➤ with them («(ideally 5+ years)»), and one that is only the soft word softens its item ("2+ years (preferred)").
const SOFT_WORD = new RegExp(`(?:${WISH})`, "giu");
const withoutSoftAside = (s: string) =>
  s.replace(/\(([^()]*)\)/g, (aside, inside: string) => {
    if (!inside.match(SOFT_WORD) || NUMBER_YEARS.test(inside)) return aside;
    return inside.replace(SOFT_WORD, "").replace(/[^\p{L}\d]+/gu, "").length
      ? " "
      : aside;
  });
// ➤ A list run together («Expérience: Vente: 2 ans (Requis) Permis: B (Requis) Niveau d'étude souhaité Bac +2») ends the
// ➤ years' item at the next label, so a wish in another item does not soften them.
const NEXT_LABEL = /\s(?=\p{Lu}[\p{L}'’/-]*(?:\s+\p{L}[\p{L}'’/-]*){0,3}\s?:)/u;
const toNextLabel = (s: string) => {
  const years = s.match(NUMBER_YEARS);
  if (!years) return s;
  const from = (years.index ?? 0) + years[0].length;
  const at = s.slice(from).search(NEXT_LABEL);
  return at < 0 ? s : s.slice(0, from + at);
};
const candidatesPart = (s: string) => {
  const kept = withoutSoftAside(toNextLabel(s));
  const included = cutAt(kept, kept.search(INCLUDING));
  return cutAt(included, wishAt(included));
};
// ➤ A wish before the years softens them, in every language of the tables («Es valorarà experiència prèvia de 2 anys»),
// ➤ and so does one that ends their clause («3 års erfaring er en fordel»), unless a label after the years starts another
// ➤ («Experiencia: 1 año … Nivel de Inglés: B2 deseable»); «5 years, preferably 7» asks five.
const WISH_FIRST = new RegExp(
  `^\\D*?(?<![\\p{L}])(?:${WISH})(?![\\p{L}])`,
  "iu",
);
const WISH_LAST = new RegExp(
  `(?<![\\p{L}])(?:${alternation("wish")}|${DENIED})[^\\p{L}]*$`,
  "iu",
);
const wishedLast = (part: string) => {
  const item = part.slice(part.lastIndexOf(":") + 1);
  return WISH_LAST.test(item) && namesYears(item);
};

// ── 3. Read ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ Patterns the requirement reader misses: a sentence that opens with its years ("3+ years in QA", "3+ years data
// ➤ analytics experience"), a label with the figure after it («Años de experiencia: 4»), a minimum beside an experience
// ➤ word, before or after the years («Expérience significative (minimum 5 ans)», «(> 3 Jahre)»).
const AFTER_OPENING_YEARS = `(?:(?:${alternation("afterYears")}|[a-z]+ing|[a-zà-ú]+(?:ando|endo|iendo))(?:(?<=['’])|(?![\\p{L}]))|(?:[\\p{L}&/-]+\\s+){1,6}${EXPERIENCE_WORD}(?![\\p{L}]))`;
const OPENS_WITH_YEARS = new RegExp(
  `^(?:[-*>]\\s*)?(?:${MINIMUM}\\s+)?(\\d{1,2})(?:\\s*[-–—]\\s*\\d{1,2}|\\s+to\\s+\\d{1,2})?\\s*${OR_MORE}?\\s*${YEAR}(?:['’]s?)?\\s+${AFTER_OPENING_YEARS}`,
  "iu",
);
const YEARS_LABEL = new RegExp(
  `^(?:[-*>•]\\s*)?${YEAR}(?:\\s+\\p{L}+['’]?){0,2}?\\s*${EXPERIENCE_WORD}(?:\\s+\\p{L}+)?\\s*:\\s*(?:${MINIMUM}\\s+)?(\\d{1,2})(?![\\d.,])`,
  "iu",
);
const KNOWN_EXPERIENCE = new RegExp(
  anyOf(words("experience", { langs: READ_BY_BOT }), ""),
  "i",
);
const MINIMUM_BEFORE = new RegExp(
  `(?:^|[\\s('’])(?:${MINIMUM}\\s+|[>≥+]\\s*)(\\d{1,2})\\s*\\+?\\s*${YEAR}\\b`,
  "iu",
);
const MINIMUM_AFTER = new RegExp(
  `(?:^|[\\s(])(\\d{1,2})(?:\\s*(?:[-–—]|to)\\s*\\d{1,2})?\\s*${YEAR}\\s+${MINIMUM}(?![\\p{L}])`,
  "iu",
);
// ➤ Not an age, a warranty, a cookie's life, nor the company's history; a wish is read before (`wishedLast`).
const NOT_EXPERIENCE = word(alternation("notExperience"), "iu");
function ownPatterns(s: string) {
  if (NOT_EXPERIENCE.test(s)) return null;
  const m =
    s.match(OPENS_WITH_YEARS) ||
    s.match(YEARS_LABEL) ||
    (KNOWN_EXPERIENCE.test(s) &&
      (s.match(MINIMUM_BEFORE) || s.match(MINIMUM_AFTER)));
  return m ? Number(m[1]) : null;
}
// ➤ A sentence alone, then under the short line above it when that is a heading ("Minimum Qualifications:" over "7–10
// ➤ years in heavy industrial construction").
const HEADING = 80;
const readSentence = (s: string, heading: string) =>
  extractRequiredYears(s) ??
  (heading
    ? extractRequiredYears(`${heading.replace(/[.!?;:]+$/, "")} ${s}`)
    : null) ??
  ownPatterns(s);

// ── The advert ───────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ An abbreviation's full stop is dropped for the requirement reader ("2+ yrs. of" → "2+ yrs of").
const ABBREVIATED = new RegExp(
  `\\b(${ABBREVIATIONS.join("|")})\\.(?=\\s)`,
  "gi",
);
// ➤ Only a sentence that names years and a number, or one year in words, is read: most of an advert names none.
const YEARS_WORD = word(
  anyOf([...YEAR_WORDS, ...words("oneYear"), ...words("yearAdjective")]),
  "iu",
);
const A_NUMBER = new RegExp(`\\d|(?<![\\p{L}])${RANGE_WORD}(?![\\p{L}])`, "iu");
const YEARS_ADJECTIVE = new RegExp(
  `${ITALIAN_YEARS.source}|${POLISH_YEARS_IN_WORDS.source}|${GERMAN_YEARS.source}|${FIGURE_YEARS.source}`,
  "iu",
);
const namesYears = (s: string) =>
  (YEARS_WORD.test(s) && A_NUMBER.test(s)) ||
  YEARS_ADJECTIVE.test(s) ||
  [YEARS_IN_OWN_WORDS, ONE_YEAR, MINIMUM_ONE_YEAR].some(
    (re) => s.search(re) >= 0,
  );
const MOST_YEARS = 15;
// ➤ More years than any advert asks are the company's own: what it asks after the next comma or verb of seeking is read on
// ➤ its own («Seit über 30 Jahren am Markt, suchen wir einen Techniker mit 2 Jahren Erfahrung»).
const YEARS_FIGURE_AT = new RegExp(
  `(?<![\\d.,])(\\d{2,3})\\s*\\+?\\s*${ANY_YEAR}(?![\\p{L}])`,
  "giu",
);
function readPast(part: string, heading: string) {
  const past = [...part.matchAll(YEARS_FIGURE_AT)]
    .filter((m) => Number(m[1]) > MOST_YEARS)
    .pop();
  const rest = past
    ? part.slice(past.index + past[0].length).replace(UP_TO_SEEKING, "")
    : "";
  return rest && namesYears(rest)
    ? readSentence(rest, "")
    : readSentence(part, heading);
}

// ➤ Experience and years written short («3 yrs exp.», «Exp. mínima 3 años», «Mind. 3 J. Berufserfahrung», «3 god.
// ➤ iskustva») are written whole before the advert is cut into sentences, so their full stop ends none.
const SHORT_EXPERIENCE = new RegExp(
  `(?<![\\p{L}])${anyOf(words("experienceShort"), "")}(?![\\p{L}])`,
  "giu",
);
const SHORT_YEAR = new RegExp(
  `(\\d\\+? ?)${anyOf(words("yearShort"), "")}(?![\\p{L}])`,
  "giu",
);
const writtenWhole = (s: string) =>
  s.replace(SHORT_EXPERIENCE, "experience").replace(SHORT_YEAR, "$1years");

// ➤ Each figure of years the title and the text ask, with the sentence that asks it.
export function yearsEach(title: unknown, text: unknown) {
  const each: { n: number; s: string }[] = [];
  const raw = [
    writtenWhole(String(title || "")),
    ...sentences(writtenWhole(String(text || "")).replace(ABBREVIATED, "$1")),
  ];
  const read = raw.map(namesYears);
  const lines = raw.map((s, i) => (read[i] ? normalised(s) : s));
  lines.forEach((line, i) => {
    if (!read[i]) return;
    let s = line;
    if (companysYears(raw[i])) {
      const rest = withoutCompanysYears(raw[i]);
      if (!namesYears(rest)) return;
      s = normalised(rest);
    }
    const part = candidatesPart(s);
    if (WISH_FIRST.test(part) || wishedLast(part)) return;
    const heading = i > 1 && lines[i - 1].length <= HEADING ? lines[i - 1] : "";
    const n = readPast(part, heading);
    if (n !== null && n >= 1 && n <= MOST_YEARS) each.push({ n, s: raw[i] });
  });
  return each;
}

// ➤ A figure the advert says it does not ask («We do not expect anyone to have ten years…»), and one offered in lieu of a
// ➤ degree («a Bachelor's degree, or 4 years…») when the advert asks another.
const SAYS_NOT_ASKED = word(alternation("notRequired"), "iu");
const IN_LIEU_OF_DEGREE = new RegExp(
  `${word(alternation("insteadOf")).source}|${word(alternation("degree")).source}[^.]{0,120}${word(alternation("or")).source}[^.]{0,60}${word(alternation("equivalent")).source}`,
  "iu",
);
// ➤ The card shows the largest figure («10+ years of experience» over «3+ years of B2B sales», a skill's); the filter
// ➤ reads the smallest, so a cap does not hide an advert that also asks less (decision 15 of the audit).
export function yearsRange(title: unknown, text: unknown) {
  const each = yearsEach(title, text).filter((e) => !SAYS_NOT_ASKED.test(e.s));
  if (!each.length) return null;
  const main = each.filter((e) => !IN_LIEU_OF_DEGREE.test(e.s));
  const figures = (main.length ? main : each).map((e) => e.n);
  return { most: Math.max(...figures), least: Math.min(...figures) };
}
export const yearsAsked = (title: unknown, text: unknown) =>
  yearsRange(title, text)?.most ?? null;
