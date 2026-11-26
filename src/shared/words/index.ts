// Each language's words for what the readers look for, one table per language and one key per concept: a word added to
// a table reaches every reader that asks for its concept. The tables in tables/ are the legacy's builder/words/*.ts,
// copied (legacy resync T002): only their imports changed. This file is its builder/words/index.ts, typed.
// A word ending in «*» is a stem: any letters may follow it; one starting with «*», a compound's end: any may come
// before; one with both, a compound's middle («*fahrzeug*»).
import { foldLetters } from "../kit/fold.js";
import ca from "./tables/ca.js";
import cs from "./tables/cs.js";
import da from "./tables/da.js";
import de from "./tables/de.js";
import en from "./tables/en.js";
import es from "./tables/es.js";
import fi from "./tables/fi.js";
import fr from "./tables/fr.js";
import hr from "./tables/hr.js";
import hu from "./tables/hu.js";
import it from "./tables/it.js";
import lt from "./tables/lt.js";
import lv from "./tables/lv.js";
import nl from "./tables/nl.js";
import no from "./tables/no.js";
import pl from "./tables/pl.js";
import pt from "./tables/pt.js";
import ro from "./tables/ro.js";
import sk from "./tables/sk.js";
import sv from "./tables/sv.js";

// A language's words for each concept, and its numbers written in words.
export type WordTable = Readonly<
  Record<
    string,
    readonly string[] | Readonly<Record<string, number>> | undefined
  >
>;
export const TABLES: Readonly<Record<string, WordTable>> = {
  en,
  es,
  ca,
  fr,
  de,
  nl,
  it,
  pt,
  pl,
  sv,
  da,
  no,
  cs,
  sk,
  fi,
  hu,
  ro,
  hr,
  lt,
  lv,
};
export type WordLanguage = string;
export const LANGUAGES: readonly string[] = Object.keys(TABLES);
// The languages Argus's requirement reader reads; the others' words are put in English for it.
export const READ_BY_BOT: readonly string[] = [
  "en",
  "es",
  "ca",
  "fr",
  "de",
  "nl",
];

const listOf = (language: string, concept: string): readonly string[] => {
  const entry = TABLES[language]?.[concept];
  return Array.isArray(entry) ? entry : [];
};
const numbersOf = (
  language: string,
  concept: string,
): Readonly<Record<string, number>> => {
  const entry = TABLES[language]?.[concept];
  return entry && !Array.isArray(entry)
    ? (entry as Readonly<Record<string, number>>)
    : {};
};

// A concept's words in the languages asked, each once. `folded`: without accents or capitals, for a text folded the same
// way; `bare`: as written and without accents both, for a text read as it came.
export function words(
  concept: string,
  {
    langs = LANGUAGES,
    folded = false,
    bare = false,
  }: {
    readonly langs?: readonly string[];
    readonly folded?: boolean;
    readonly bare?: boolean;
  } = {},
): string[] {
  const all = langs.flatMap((language) => listOf(language, concept));
  const forms = folded
    ? all.map(foldLetters)
    : bare
      ? all.flatMap((word) => [word, foldLetters(word)])
      : all;
  return [...new Set(forms)];
}

const escape = (word: string) => word.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

// The words as one alternation for a regular expression, the longest first so none stops short of a longer one.
// `rest`: what may follow a stem («\\w*» in a folded text).
export const anyOf = (list: Iterable<string>, rest = "\\p{L}*"): string =>
  `(?:${[...list]
    .toSorted((a, b) => b.length - a.length || a.localeCompare(b))
    .map(
      (word) =>
        (word.startsWith("*") ? rest : "") +
        escape(word.replace(/^\*|\*$/g, "")) +
        (word.endsWith("*") ? rest : ""),
    )
    .join("|")})`;

// A demand denied («No se requiere», «Krävs inte.», «Nie jest wymagana»): the negation before the demand, a word apart
// at most, or ending the clause right after it («Imprescindible no fumar» denies nothing). `letter`: a word's character.
export const deniedDemand = (no: string, demand: string, letter: string) =>
  `(?<!${letter})(?:(?:${no})\\s+(?:${letter}+\\s+)?(?:${demand})(?!${letter})|(?:${demand})\\s+(?:${no})(?=\\s*(?:[.,;:!?)]|$)))`;

// A concept's phrases as one alternation, as written and without accents, «#» in a phrase standing for a number of one
// or two digits («en los últimos # años»).
export const phrases = (concept: string) =>
  anyOf(words(concept, { bare: true })).replaceAll("#", "\\d{1,2}");

// The numbers written in words, by language: { word: number }, from `least` to `most`. `concept`: another table of
// words and their numbers («monthNumbers»: «März» is 3).
export function numbers({
  concept = "numbers",
  langs = LANGUAGES,
  folded = false,
  least = 1,
  most = Infinity,
}: {
  readonly concept?: string;
  readonly langs?: readonly string[];
  readonly folded?: boolean;
  readonly least?: number;
  readonly most?: number;
} = {}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const language of langs)
    for (const [word, number] of Object.entries(numbersOf(language, concept)))
      if (number >= least && number <= most)
        out[folded ? foldLetters(word) : word] = number;
  return out;
}
