// Titles written all in capitals ("SENIOR PROCESS ENGINEER FOR PHARMA") brought down to the way the
// other titles are written, their acronyms kept ("SAP", "PLC", "CNC"). How each word is written the
// build's titles say: the spelling the others use most, so "IOT" is "IoT" and "DEVOPS" "DevOps"
// (advert-facts FR-4). Legacy builder/calm-titles.ts.

// The short words kept small inside a title, in the languages titles come in (the legacy web's
// app/lib/i18n.ts SMALL).
const SMALL: ReadonlySet<string> = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
  "de",
  "del",
  "der",
  "des",
  "di",
  "du",
  "la",
  "le",
  "van",
  "von",
  "y",
  "e",
  "en",
  "el",
  "los",
  "las",
  "les",
  "et",
  "para",
  "por",
  "con",
  "amb",
  "per",
  "i",
  "o",
  "u",
  "al",
  "il",
  "della",
  "dei",
  "da",
  "do",
  "dos",
  "das",
  "em",
  "und",
  "für",
  "mit",
  "im",
  "zu",
  "het",
  "voor",
  "og",
  "och",
  "z",
  "w",
  "à",
  "au",
  "aux",
]);

export type Spellings = ReadonlyMap<string, string>;

// A title in capitals: eight letters at least, seven in ten of them capitals.
export function shouting(title: string): boolean {
  const letters = title.match(/\p{L}/gu) ?? [];
  return (
    letters.length >= 8 &&
    letters.filter((letter) => letter !== letter.toLowerCase()).length /
      letters.length >=
      0.7
  );
}

const RUN = /[\p{L}\p{N}]+/gu;
const EDGES = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

// «ß» has no capital of its own in most texts: a word in capitals may hold it («MAßSCHNEIDER», NOA-10).
const caps = (word: string) => {
  const letters = word.replace(/ß/g, "");
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
};

// How the titles not in capitals write each word (its letters and figures, between spaces or
// signs): the spelling they use most, when it appears three times or more. Whole words with signs
// inside ("C&I", "I+D", "PL/SQL") are counted too.
export function spellingsOf(titles: Iterable<string>): Spellings {
  const counts = new Map<string, Map<string, number>>();
  const add = (word: string) => {
    const key = word.toUpperCase();
    let forms = counts.get(key);
    if (!forms) {
      forms = new Map();
      counts.set(key, forms);
    }
    forms.set(word, (forms.get(word) ?? 0) + 1);
  };
  for (const title of titles) {
    if (!title || shouting(title)) continue;
    for (const token of title.split(/\s+/)) {
      const core = token.replace(EDGES, "");
      if (/[^\p{L}\p{N}]/u.test(core) && /\p{L}/u.test(core)) add(core);
      for (const run of core.match(RUN) ?? []) if (/\p{L}/u.test(run)) add(run);
    }
  }
  const out = new Map<string, string>();
  for (const [key, forms] of counts) {
    let total = 0;
    let best = "";
    let most = 0;
    for (const [form, count] of forms) {
      total += count;
      if (count > most) {
        best = form;
        most = count;
      }
    }
    // A word longer than an acronym stays in capitals only when the titles nearly always write it
    // so (the brand "STACKIT"), not when titles in capitals merely outnumber ("SYSTEMES").
    if (caps(best) && best.length > 5 && most < 0.8 * total)
      best = best.toLowerCase();
    if (total >= 3) out.set(key, best);
  }
  return out;
}

// A word of the title in capitals as the titles write it: its own spelling when it has an
// acronym's or inner capitals ("SAP", "IoT"), else in small letters; a Roman numeral, and a word
// of three letters or fewer with no vowel the titles do not know ("TZB"), stay.
function wordAs(run: string, spellings: Spellings): string {
  const known = spellings.get(run.toUpperCase());
  if (known && (caps(known) || /\p{Ll}\p{Lu}/u.test(known))) return known;
  if (!known && /^(?:II|III|IV|VI|VII|VIII|IX)$/.test(run)) return run;
  if (
    !known &&
    /^\p{L}{1,3}$/u.test(run) &&
    !/[aeiouyàáâäãåèéêëìíîïòóôöõùúûüýæœø]/i.test(run)
  )
    return run;
  return run.toLowerCase();
}

// One title in capitals written the usual way: each word in capitals as the titles write it, then
// a capital at the start of each word but the short ones inside ("of", "de", "y", "en"); what the
// title already wrote in small letters ("(m/ž)") stays as it is. A title not in capitals is
// returned unchanged.
export function calmTitle(title: string, spellings: Spellings): string {
  if (!shouting(title)) return title;
  const tokens = title.split(/(\s+)/);
  const wordAt = tokens.map((token) => /\p{L}/u.test(token));
  const firstWord = wordAt.indexOf(true);
  const lastWord = wordAt.lastIndexOf(true);
  return tokens
    .map((token, index) => {
      if (!wordAt[index] || !caps(token.replace(/[^\p{L}]/gu, "")))
        return token;
      const core = token.replace(EDGES, "");
      const whole = spellings.get(core.toUpperCase());
      // A word with signs inside written as the titles write it, «(m/w/d)» too, not «(M/w/d)» (NOA-10).
      if (whole && /[^\p{L}\p{N}]/u.test(core))
        return token.replace(core, whole);
      let out = token.replace(RUN, (run) => wordAs(run, spellings));
      // "ENGINEER I" ends on a level, not the Catalan "i".
      if (token === "I" && index === lastWord) out = "I";
      if (index !== firstWord && SMALL.has(out.toLowerCase())) return out;
      // An elided article or preposition small and the word after it capital: «Cap d'Obra»,
      // «l'Enginyer» (NOA-10).
      const elided = /^(\p{L}{1,2})(['’])(\p{L})(.*)$/u.exec(out);
      if (elided) {
        const [, article = "", mark = "", letter = "", rest = ""] = elided;
        const opening =
          index === firstWord
            ? (article[0] ?? "").toUpperCase() + article.slice(1)
            : article;
        out = `${opening}${mark}${letter.toUpperCase()}${rest}`;
        if (index !== firstWord) return out;
      }
      return out.replace(
        /^([("'¿¡[]*)(\p{Ll})/u,
        (_, open: string, letter: string) => open + letter.toUpperCase(),
      );
    })
    .join("");
}

// The titles of a build brought down, each by what the build's other titles say. A source whose
// terms ask that its content not be altered (config/untranslated.yml) keeps its capitals (FUE-11).
export function titleCalmer(
  titles: Iterable<string>,
  keptAsWritten: ReadonlySet<string>,
): (advert: { readonly title: string; readonly source: string }) => string {
  const spellings = spellingsOf(titles);
  return ({ title, source }) =>
    keptAsWritten.has(source) ? title : calmTitle(title, spellings);
}
