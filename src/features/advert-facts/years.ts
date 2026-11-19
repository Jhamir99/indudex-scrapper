// The years of experience an advert asks for (advert-facts FR-5): read one sentence at a time with
// Argus's reader, the sentence with the short line before it when alone it says nothing (a heading:
// "Minimum Qualifications Required:" over "7–10 years in heavy industrial construction"), after
// putting into English for it the languages it does not read. A range with "et", "e" or "și" is a
// range, its low end kept; "less than 3 years" is a ceiling; a sentence that opens with the years
// or names a minimum beside an experience word asks for them. Legacy builder/years.mjs (the largest
// figure since 9 November 2026; docs/research/years-asked.md there).
import { extractRequiredYears } from "./argus/requirements.js";
import { sentences } from "../../shared/kit/sentences.js";
import {
  LANGUAGES,
  READ_BY_ARGUS,
  anyOf,
  numbers,
  words,
} from "../../shared/words/index.js";

// The words for years the requirement reader knows (its YEAR, in its six languages); the others' are put in English for it.
const BOT_YEAR = /^(?:years?|yrs?|años?|anys|ans?|jahren?|jaar|jaren)$/;
const YEAR_WORDS = words("year", { bare: true });
const ANY_YEAR = anyOf(YEAR_WORDS);
const YEAR = anyOf(YEAR_WORDS.filter((w) => BOT_YEAR.test(w)));
const OTHER_YEARS = new RegExp(
  `(?<![\\p{L}\\d])(\\d{1,2})(\\s*(?:[-–—]\\s*\\d{1,2}\\s*)?\\+?\\s*)${anyOf(YEAR_WORDS.filter((w) => !BOT_YEAR.test(w)))}(?![\\p{L}])`,
  "giu",
);
const OTHER_EXPERIENCE = new RegExp(
  `(?<![\\p{L}])${anyOf(words("experience", { languages: LANGUAGES.filter((l) => !READ_BY_ARGUS.includes(l)) }))}(?![\\p{L}])`,
  "giu",
);
const RANGE = new RegExp(
  `(?<![\\p{L}\\d])(\\d{1,2})\\s+(?:et|e|és|i|și|si|och|og|a|à)\\s+(\\d{1,2})(?=\\s+${YEAR}(?![\\p{L}]))`,
  "giu",
);
const CEILING = new RegExp(
  `(?<![\\p{L}])(?<!\\b(?:al|au|pelo|ao)\\s)(?:<|≤|${anyOf(words("lessThan"))})(?=\\s+\\d)`,
  "giu",
);
// Not experience: an age ("18 years old"), a recent certificate ("held within the last 2 years").
const AGE = new RegExp(
  `(?<![\\p{L}\\d])\\d{1,2}\\s*\\+?\\s*${ANY_YEAR}\\s+(?:old|of age|d['’]âge|de edad|alt|oud|di età|de idade)(?![\\p{L}])`,
  "giu",
);
const RECENT =
  /(?<![\p{L}])(?:within|in|over|during) the (?:last|past) \d{1,2}\s*years?|(?:au cours des|dans les) \d{1,2} dernières années|en los últimos \d{1,2} años|in den letzten \d{1,2} jahren/giu;
// Years written in words, two to ten («Mindestens zwei Jahre», "At least three years", «Au moins deux ans»: none were
// read), and "more than" as the least asked («More than three years» showed four; the readers, 2 November 2026).
// Catalan's own too («Dos anys d'experiència», DAA-25).
const WORD_NUMBER = numbers({ least: 2 });
const YEARS_AFTER = `(?=\\s*\\+?\\s*${ANY_YEAR}(?![\\p{L}]))`;
// Not the last part of a number joined by a hyphen («twenty-five years» is no five, DAA-25).
const WORD_YEARS = new RegExp(
  `(?<![\\p{L}-])(${anyOf(Object.keys(WORD_NUMBER))})${YEARS_AFTER}`,
  "giu",
);
// A range in words, both ends («drei bis fünf Jahre», "One to three years" showed five and three), one among them.
const RANGE_NUMBER = numbers();
const RANGE_WORD = anyOf(Object.keys(RANGE_NUMBER));
const WORD_RANGE = new RegExp(
  `(?<![\\p{L}])(${RANGE_WORD}|\\d{1,2})\\s*(?:-|–|to|bis|à|a|tot|y|e|and|und|et|en)\\s*(${RANGE_WORD}|\\d{1,2})${YEARS_AFTER}`,
  "giu",
);
const asNumber = (w: string) =>
  /\d/.test(w) ? w : String(RANGE_NUMBER[w.toLowerCase()]);
const MORE_THAN = new RegExp(
  `(?<![\\p{L}])${anyOf(words("moreThan"))}\\s+(\\d{1,2})${YEARS_AFTER}`,
  "giu",
);
// Polish writes the years as an adjective («co najmniej 3 letnie doświadczenie», «2-letnie doświadczenie»).
const POLISH_YEARS = /(?<![\p{L}\d])(\d{1,2})\s*-?\s*letni\p{L}*/giu;
const inEnglish = (s: string) =>
  s
    .replace(POLISH_YEARS, "$1 lat ")
    .replace(AGE, " ")
    .replace(RECENT, " ")
    .replace(
      WORD_RANGE,
      (_, a: string, b: string) => `${asNumber(a)} to ${asNumber(b)}`,
    )
    .replace(WORD_YEARS, (w) => String(WORD_NUMBER[w.toLowerCase()]))
    .replace(MORE_THAN, "$1+")
    .replace(OTHER_YEARS, "$1$2years")
    .replace(OTHER_EXPERIENCE, "experience")
    .replace(RANGE, "$1 to $2")
    .replace(CEILING, "up to");
// A company's own years, which a sentence opens with and no candidate is spoken to in («Mit über 15 Jahren Erfahrung
// bieten wir unseren Kunden…», "With over 20 years of experience, we…").
const BOAST = new RegExp(
  String.raw`^\s*(?:mit (?:über|mehr als)|with (?:over|more than)|avec plus de|fort(?:e|s)? de plus de|met (?:meer dan|ruim)|con más de|con mas de|amb més de|amb mes de|con oltre|con più di|con piu di)\s+(?:[2-9]|[1-9]\d)\s+${ANY_YEAR}`,
  "iu",
);
// And the company's years said with the company as its subject anywhere in the sentence («Somos una empresa con más de 10
// años de experiencia»): read as asked, they hid the offer from a visitor's cap on years (DAA-02). Not when the company
// seeks someone with them («Empresa del sector busca técnico con 5 años»).
// The verbs of a company seeking someone: what follows them is asked of the candidate.
const SEEK =
  "busc|precis|necesit|requier|requer|sucht|recherch|seek|look|zoek|cerca|hire|incorpor";
// In the languages of its words only: Swedish «som» is «who» («Vi söker dig som har minst 2 års erfarenhet»). And two
// years or more: «Somos una empresa… con experiencia de al menos 1 año» asks the one year (the server's comparison).
const OWN_YEAR = anyOf(
  words("year", {
    languages: ["es", "ca", "en", "fr", "de", "nl", "it"],
    bare: true,
  }),
);
const OWN_YEARS = new RegExp(
  String.raw`(?<![\p{L}])(?:somos|som|sommes|wir sind|we are|we're|zijn wij|wij zijn|siamo|llevamos|portem|empresa|compañía|compania|companyia|equipo|equip|une entreprise|ein unternehmen|unser team|an? company|our team|een bedrijf|bedrijf|un'azienda|el nostre equip|nuestra empresa|notre entreprise|unser unternehmen|our company)(?![\p{L}])(?:(?!${SEEK})[^.]){0,80}?(?<!\d)(?:[2-9]|[1-9]\d)\s+${OWN_YEAR}(?![\p{L}])`,
  "iu",
);
// A sentence without the company's own years, up to the next comma or verb of seeking: what it asks after them is still read («Amb més de 20
// anys d'experiència, busquem tècnic amb 2 anys»).
const UP_TO_SEEK = new RegExp(`^(?:(?!${SEEK})[^,;])*`, "iu");
function withoutOwnYears(s: string): string {
  for (const re of [BOAST, OWN_YEARS]) {
    const m = s.match(re);
    if (m && m.index !== undefined)
      s =
        s.slice(0, m.index) +
        s.slice(m.index + m[0].length).replace(UP_TO_SEEK, "");
  }
  return s;
}
const TO_YOU =
  /(?<![\p{L}])(?:du|dein\p{L}*|sie|ihr\p{L}*|you|your|vous|votre|vos|je|jouw|u|tu|tú|tus|te|usted|ustedes|teu|teva|vostè)(?![\p{L}])/iu;

// The years a sentence opens with, or a minimum beside an experience word: 1 to 15, not an age ("18 jaar", "years
// old"), a warranty, a cookie's life, the company's own history, nor a wish ("preferred", "a plus").
const MINIMUM = anyOf(words("atLeast"));
const OPENS = new RegExp(
  `^(?:[-*>]\\s*)?(?:${MINIMUM}\\s+)?(\\d{1,2})(?:\\s*[-–—]\\s*\\d{1,2}|\\s+to\\s+\\d{1,2})?\\s*(?:\\+|plus|or more|ou plus|o más|oder mehr|of meer)?\\s*${YEAR}(?:['’]s?)?\\s+(?:of|in|with|as|at|on|for|[a-z]+ing|[a-zà-ú]+(?:ando|endo|iendo)|en tant que|hands|professional|relevant|industry|prior|post|minimum|de|d['’]|en|dans|im|als|met|ervaring|experience)\\b`,
  "iu",
);
const AT_LEAST = new RegExp(
  `(?:^|[\\s(])${MINIMUM}\\s+(\\d{1,2})\\s*\\+?\\s*${YEAR}\\b`,
  "iu",
);
const EXPERIENCE = new RegExp(
  words("experience", { languages: READ_BY_ARGUS })
    .map((w) => w.replace("*", ""))
    .join("|"),
  "i",
);
// A minimum written after the years («(5 à 7 ans minimum)», "3 years minimum"), beside an experience word.
const MINIMUM_AFTER = new RegExp(
  `(?:^|[\\s(])(\\d{1,2})(?:\\s*(?:[-–—]|to)\\s*\\d{1,2})?\\s*${YEAR}\\s+${MINIMUM}(?![\\p{L}])`,
  "iu",
);
const NOT_ASKED =
  /\b(old|ago|age|âge|edad|alt|oud|leeftijd|garantie|warranty|guarantee|cookies?|speicherdauer|retention|founded|since|depuis|seit|desde|in business|on the market|in the market|am markt|sur le marché|en el mercado|op de markt|anniversary|years young|preferred|preferably|ideally|a plus|an asset|bonus|souhaité|souhaitable|apprécié|wünschenswert|von vorteil|valorable|se valora|bij voorkeur)\b/i;
function opening(s: string): number | null {
  if (NOT_ASKED.test(s)) return null;
  const m =
    s.match(OPENS) ||
    (EXPERIENCE.test(s) && (s.match(AT_LEAST) || s.match(MINIMUM_AFTER)));
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 15 ? n : null;
}

// What a requirement includes after its total ("8+ years of product management, including 3+ years managing PMs"):
// the total is asked, so the rest is cut off, but only when the total comes first ("with at least 10 years of
// industry experience" alone is the requirement).
const PART_OF =
  /,?\s+(?:including|incl\.?|of which|with at least|whereof|dont|davon|incluyendo|de los cuales|inclusief|waarvan|di cui|w tym|varav|heraf|hvorav|z toho|joista|ebből|din care|od toga)(?![\p{L}])/iu;
const NUMBER_YEARS = new RegExp(`\\d{1,2}\\s*\\+?\\s*${YEAR}\\b`, "i");
const ownPart = (s: string) => {
  const m = s.match(PART_OF);
  return m && NUMBER_YEARS.test(s.slice(0, m.index)) ? s.slice(0, m.index) : s;
};
// A wish after the years that speaks of something else («Minimum 5 years of professional engineering experience, ideally
// within the automotive industry», "Experience: 2–5 years in a project coordination role, preferably within the low
// voltage or IT industry"): the years are asked, the field is wished, so the wish is cut off. Only after a comma or a
// dash and with the years before it: «5 years, preferably 7» keeps its wish on the years. The free-label bench, 9
// November 2026 (docs/research/indudex-lector.md).
const WISH_AFTER =
  /\s*[,;–—-]\s*(?:ideally|preferabl\p{L}*|idealerweise|vorzugsweise|vorzugweise|de préférence|idéalement|idealmente|preferiblemente|preferibilmente|bij voorkeur|idealiter|gerne|gern)(?![\p{L}])|\s+(?:ideally|preferabl\p{L}*|idealerweise|vorzugsweise|de préférence|idéalement|idealmente|preferiblemente|preferibilmente|bij voorkeur)\s+(?:in|within|im|in der|en|dans|bei|op|nel|nella|w)(?![\p{L}])/iu;
const withoutWish = (s: string) => {
  const m = s.match(WISH_AFTER);
  return m && NUMBER_YEARS.test(s.slice(0, m.index)) ? s.slice(0, m.index) : s;
};
// An aside in brackets that softens something else («Minimum 3 years of experience in production (preferably in the electronics
// sector)», "BS (MS preferred) with 10+ years", "1+ years (2+ preferred)") does not soften the years outside it; one that holds
// the years goes with them («(ideally 5+ years)»), and one that is the soft word alone softens its item ("2+ years managing a
// team (preferred)").
const SOFT_WORD =
  /preferabl\p{L}*|preferred|ideally|bevorzugt|idealerweise|de préférence|preferiblemente|bij voorkeur|preferibilmente/giu;
const withoutSoftAside = (s: string) =>
  s.replace(/\(([^()]*)\)/g, (aside: string, inside: string) => {
    if (!inside.match(SOFT_WORD) || NUMBER_YEARS.test(inside)) return aside;
    return inside.replace(SOFT_WORD, "").replace(/[^\p{L}\d]+/gu, "").length
      ? " "
      : aside;
  });
// Abbreviations whose full stop ends no sentence ("2+ yrs. of", "mind. 3-5 Jahre", "min. 3 lata").
const ABBREVIATED =
  /\b(yrs|mind|min|ca|approx|env|inkl|incl|dipl|ing)\.(?=\s)/gi;
// A line short enough to be a heading or a label ("Experience", "Required Qualifications", "Ihr Profil:").
const HEADING = 80;
// Only a sentence that names years, in any of the languages read, is read at all: most of an advert names none, and
// reading every sentence took 1.8 ms on a text of 12,000 characters against 0.4 for the old reader (1 November 2026).
const YEARS_WORD = new RegExp(
  `(?<![\\p{L}])${anyOf([...YEAR_WORDS, "letni*"])}(?![\\p{L}])`,
  "iu",
);
// «One» is a number to look for; the other languages' ones are their articles too («un», «ein»).
const A_NUMBER = new RegExp(
  `\\d|\\b${anyOf([...Object.keys(WORD_NUMBER), "one"])}\\b`,
  "i",
);
const namesYears = (s: string) => YEARS_WORD.test(s) && A_NUMBER.test(s);
// Each figure of years the title and the text ask, with the sentence that asks it.
export function yearsEach(
  title: string,
  text: string,
): { n: number; s: string }[] {
  const each: { n: number; s: string }[] = [];
  const raw = [title, ...sentences(text.replace(ABBREVIATED, "$1"))];
  const wanted = raw.map(namesYears);
  const lines = raw.map((s, i) => (wanted[i] ? inEnglish(s) : s));
  lines.forEach((s, i) => {
    if (!wanted[i]) return;
    const said = raw[i] ?? "";
    if ((BOAST.test(said) || OWN_YEARS.test(said)) && !TO_YOU.test(said)) {
      const rest = withoutOwnYears(said);
      if (!namesYears(rest)) return;
      s = inEnglish(rest);
    }
    const before =
      i > 1 && (lines[i - 1] ?? "").length <= HEADING
        ? (lines[i - 1] ?? "")
        : "";
    const own = withoutWish(ownPart(withoutSoftAside(s)));
    const n =
      extractRequiredYears(own) ??
      (before
        ? extractRequiredYears(`${before.replace(/[.!?;:]+$/, "")} ${own}`)
        : null) ??
      opening(own);
    // More than 15 is the company's own history read as a demand («plus de 30 ans d'expérience», «al meer dan 30 jaar»):
    // 2,159 of 82,661 published cards with years showed 16 to 31 (1 November 2026), none asked of a candidate.
    if (n !== null && n <= 15) each.push({ n, s: said });
  });
  return each;
}
// The years an advert asks: the largest of the figures it asks («10+ years of professional experience» over «3+ years of
// B2B SaaS sales», a skill's), not the smallest. Judged by hand on 40 adverts drawn at random of the 18,310 in a quarter
// of the store that ask two figures (9 November 2026), the largest was the demand on 34, the smallest on 5: a figure the
// advert says it does not ask («We do not expect anyone to have ten years of experience with tools…»), one in lieu of a
// degree («a Bachelor's degree, or 4 years…»), an advert for every level, two unclear. The first two are left out.
const SAYS_NOT_ASKED =
  /(?<![\p{L}])(?:do not expect|don't expect|we don't need|no need|not required|not necessary|nicht erforderlich|nicht notwendig|nicht n[öo]tig|pas besoin|pas n[ée]cessaire|no es necesari[oa]|no se requiere|no requerid[oa]|niet nodig|niet vereist|non richiest[oa]|non necessari[oa])(?![\p{L}])/iu;
const IN_LIEU_OF_DEGREE =
  /(?<![\p{L}])(?:in lieu of|instead of|anstelle|statt eines|à défaut|en lugar de|en su defecto|in plaats van)(?![\p{L}])|(?<![\p{L}])(?:degree|bachelor'?s?|master'?s?|diploma|studium|hochschulabschluss|ausbildung|dipl[ôo]me|licence|t[íi]tulo|grado|opleiding|laurea)(?![\p{L}])[^.]{0,120}(?<![\p{L}])(?:or|oder|ou|o|of|oppure)(?![\p{L}])[^.]{0,60}(?<![\p{L}])(?:equivalent|equivalente|äquivalent\p{L}*|[ée]quivalent\p{L}*|vergleichbar\p{L}*|gelijkwaardig\p{L}*)(?![\p{L}])/iu;
// The card shows the largest; the filter reads the smallest, so a cap does not hide an advert that also asks less
// (decision 15 of the audit, 15 November 2026).
export function yearsRange(
  title: string,
  text: string,
): { most: number; least: number } | null {
  const each = yearsEach(title, text).filter((e) => !SAYS_NOT_ASKED.test(e.s));
  if (!each.length) return null;
  const main = each.filter((e) => !IN_LIEU_OF_DEGREE.test(e.s));
  const figures = (main.length ? main : each).map((e) => e.n);
  return { most: Math.max(...figures), least: Math.min(...figures) };
}
export const yearsAsked = (title: string, text: string) =>
  yearsRange(title, text)?.most ?? null;
