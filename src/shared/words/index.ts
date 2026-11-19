import { fold } from "../kit/fold.js";
import { TABLES, type WordTable } from "./tables.js";

export type WordLanguage = keyof typeof TABLES;
export type Concept = Exclude<keyof WordTable, "numbers">;

export const LANGUAGES = Object.keys(TABLES) as WordLanguage[];

// The languages Argus's requirement reader reads; the others' words are put in English for it.
export const READ_BY_ARGUS: readonly WordLanguage[] = [
  "en",
  "es",
  "ca",
  "fr",
  "de",
  "nl",
];

const tableOf = (language: WordLanguage): WordTable => TABLES[language];

// A concept's words in the languages asked, each once. `folded`: without accents or capitals,
// for a text folded the same way; `bare`: as written and without accents both, for a text read
// as it came.
export function words(
  concept: Concept,
  {
    languages = LANGUAGES,
    folded = false,
    bare = false,
  }: {
    readonly languages?: readonly WordLanguage[];
    readonly folded?: boolean;
    readonly bare?: boolean;
  } = {},
): string[] {
  const all = languages.flatMap((language) => tableOf(language)[concept] ?? []);
  const forms = folded
    ? all.map(fold)
    : bare
      ? all.flatMap((word) => [word, fold(word)])
      : all;
  return [...new Set(forms)];
}

const escape = (word: string) => word.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

// The words as one alternation for a regular expression, the longest first so none stops short of
// a longer one. `rest`: what may follow a stem.
export function anyOf(list: Iterable<string>, rest = "\\p{L}*"): string {
  const sorted = [...list].toSorted(
    (a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0),
  );
  return `(?:${sorted
    .map((word) =>
      word.endsWith("*") ? escape(word.slice(0, -1)) + rest : escape(word),
    )
    .join("|")})`;
}

// The numbers written in words, by language: { word: number }, from `least` to `most`.
export function numbers({
  languages = LANGUAGES,
  folded = false,
  least = 1,
  most = Infinity,
}: {
  readonly languages?: readonly WordLanguage[];
  readonly folded?: boolean;
  readonly least?: number;
  readonly most?: number;
} = {}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const language of languages)
    for (const [word, number] of Object.entries(
      tableOf(language).numbers ?? {},
    ))
      if (number >= least && number <= most)
        out[folded ? fold(word) : word] = number;
  return out;
}
