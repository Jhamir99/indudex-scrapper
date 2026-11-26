// ➤ An advert's text split into sentences, the unit the screens read: a requirement is stated
// ➤ in a whole sentence ("5+ years of experience", "a degree in mechanical engineering"), so
// ➤ the years, degrees and languages the visitor is judged against are read off sentences and
// ➤ not off stray words. The text itself never leaves the builder: only what the screens found.
// ➤ A stored text that still carries its page's markup (8 % of employers' sites, 20 % of portals, 1 November 2026) ends a
// ➤ sentence at each paragraph and list item as well.
// ➤ Abbreviations whose full stop ends no sentence ("2+ yrs. of", «mind. 3-5 Jahre», «salaris van max. € 5.000», "a degree
// ➤ (e.g. Mechanical Engineering)", «Studium (z. B. Elektrotechnik)»), as patterns: «z. B.» is written spaced or not.
// The legacy's builder/sentences.ts, copied (legacy resync T003): only its imports changed. Its own comments keep their marks.
export const ABBREVIATIONS = [
  "yrs",
  "mind",
  "min",
  "max",
  "máx",
  "ca",
  "approx",
  "env",
  "inkl",
  "incl",
  "dipl",
  "ing",
  "e\\.g",
  "i\\.e",
  "z",
  "z\\. ?b",
  "bzw",
  "bspw",
  "ggf",
  "evtl",
  "vgl",
  "u\\. ?a",
  "p",
  "p\\. ?ex",
  "p\\. ?ej",
];
// ➤ A bullet alone splits, its spaces trimmed after: «\s*» before it was quadratic on a long run of spaces (NOA-14). The
// ➤ dot of Catalan «l·l» is no bullet («Instal·lacions Elèctriques» was cut in two).
const SPLIT = new RegExp(
  `(?<=[.!?])(?<!\\b(?:${ABBREVIATIONS.join("|")})\\.)\\s+|\\n+|[•▪●]|(?<![lL])·|·(?![lL])|` +
    "<\\/?(?:p|li|ul|ol|br|div|h[1-6]|tr|td|th|table|section)(?:\\s[^<>]*)?\\/?>",
  "i",
);
// ➤ A list whose markup was lost glues its items with a semicolon before a capital («€15,02;Een vast contract»); a gender
// ➤ ending in capitals is no item («MONTEUR;INNEN»).
const GLUED_ITEM = /(?<!\p{Lu}|&#?\w+);(?=\p{Lu})/gu;
export function sentences(text: unknown): string[] {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(GLUED_ITEM, "\n")
    .split(SPLIT)
    .map((s) =>
      s
        .replace(/<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((s) => s.length > 2);
}
