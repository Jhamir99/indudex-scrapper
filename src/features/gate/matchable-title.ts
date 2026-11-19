import { fold } from "../../shared/kit/fold.js";
import { TITLES as T } from "./title-rules.js";

// The title as the gate reads it, and its further readings (legacy `builder/gate.mjs`).

// Characters that show nothing: a zero-width space after each slash of "(d/m/f)" (524 published
// titles on 27 October 2026) kept the gender marks from being read; a soft hyphen splits a word.
// Named by their codes, not written in.
// An alternation, not a class: a zero-width joiner beside another mark in a class reads as one
// sequence.
const INVISIBLE = /\u00ad|\u200b|\u200c|\u200d|\u2060|\ufeff/g;

// A title as the gate reads it: gender marks ("Ingeniero/a", "Arquitecto/ta", "(m/w/d)", "H/F",
// and French endings in brackets or after a middle dot: "Conducteur(trice)", "Ingénieur(e)",
// "technicien·ne") go, then the shared folding. Not Argus's cleanTitle, which tidies a title for
// display. A word written for both genders goes once ("Técnico/Técnica", "Oficial/Oficiala"), and
// so do a reference number in front and a board's "Oferta de empleo para…".
export const matchableTitle = (title: string): string =>
  T.clean(
    fold(title.replace(INVISIBLE, ""))
      .replace(
        /(?<![a-z])([a-z]{4,})\s*\/\s*([a-z]{4,})(?![a-z])/g,
        (all, word: string, other: string) =>
          other === `${word}a` ||
          (/[oe]$/.test(word) && other === `${word.slice(0, -1)}a`)
            ? word
            : all,
      )
      .replace(
        /\s?\/(?:a|o|as|os|es|ra|ora|ores|e|in|f|d|ta|ca|fa|na|la|da|va|ia|ica|ico|era|ona|essa|iva|trice|rice|euse|ere|ne|ienne|aria|aries|ria|rias|ques|cas|cos|las|ales|ada|ades|ana|anes|anta|antes|ives)(?![a-z])/g,
        "",
      )
      .replace(
        /(?<=[a-z])(?:\((?:e|es|se|ne|trice|rice|ice|euse|ere)\)|[·.](?:e|es|se|ne|trice|rice|euse|ere))(?![a-z])/g,
        "",
      )
      .replace(/\((?:m|w|d|f|h|x|\/|\s)+\)/g, " ")
      .replace(/^\s*(?:#?\d+[\s_.#-]+)+/, "")
      .replace(
        /^\s*(?:ofertas? de (?:empleo|trabajo)(?: para)?|bolsa de empleo|se buscan?|buscamos)\s*[:|-]?\s*/,
        "",
      )
      // The graduate schemes' way of naming a graduate engineer ("Electrical Engineering Graduate").
      .replace(
        /(?<![a-z])engineering graduates?(?![a-z])/g,
        "graduate engineer",
      )
      // The misspellings of "engineer" found in the adverts left out ("Mooring & Subsea Enigneer").
      .replace(
        /(?<![a-z])(?:enigneer|enginner|enginer|engeneer)(s?)(?![a-z])/g,
        "engineer$1",
      ),
  );

// The second reading, for a title the first found nothing in, cleans the words the way
// occupationcoder does, the title coder of the ONS Data Science Campus (Turrell et al., 2019): a
// plural reads as its singular, a hyphen or a slash separates words, and a few abbreviations and
// misspellings are spelt out, so "Senior Project Engineers" reads as "senior project engineer" and
// "CAD-Designer" as "cad designer". The index's titles are read the same way. occupationcoder also
// drops the words no title of the index uses, then compares what is left whole; this gate finds
// titles inside the advert's title, where a dropped word made "Site Selection Manager" a site
// manager, so every word stays (the legacy's docs/research/occupation-coding.md). Plurals that are
// words of their own stay (occupationcoder's list, and "facilities"), and so do words ending in
// -ics, -ss, -us or -is (electronics, process, campus, analysis).
const KEEP_AS_IS = new Set([
  "accounts",
  "claims",
  "communications",
  "complaints",
  "events",
  "goods",
  "grounds",
  "lettings",
  "loans",
  "operations",
  "relations",
  "sales",
  "services",
  "systems",
  "years",
  "facilities",
]);

export function lemma(word: string): string {
  if (
    word.length <= 3 ||
    KEEP_AS_IS.has(word) ||
    /(?:ss|us|is|ics)$/.test(word)
  )
    return word;
  if (word.endsWith("men")) return `${word.slice(0, -3)}man`;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(?:sh|ch|x|z)es$/.test(word) || word.endsWith("sses"))
    return word.slice(0, -2);
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

// Abbreviations, and the misspellings found in the adverts left out (September 2026).
const SPELT_OUT: Readonly<Record<string, string>> = {
  snr: "senior",
  sr: "senior",
  jnr: "junior",
  jr: "junior",
  mgr: "manager",
  engr: "engineer",
  enigneer: "engineer",
  enginner: "engineer",
  enginer: "engineer",
  engeneer: "engineer",
};

// Words are letters and digits: a hyphen or a slash separates them ("CAD-Designer").
export const lemmaWords = (text: string): string[] =>
  T.clean(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) =>
      lemma(Object.hasOwn(SPELT_OUT, word) ? (SPELT_OUT[word] ?? word) : word),
    );

// A title as the second reading takes it, in pieces split where the title lists or joins
// ("Ingeniero técnico o industrial", "Calculator / Werkvoorbereider"): a title is never found
// across two pieces.
const PIECES =
  /[/,;|()[\]&+·–—]| - |(?<![a-z])(?:or|and|o|y|u|et|ou|und|oder|en|og|och|eller)(?![a-z])/;
export const secondReading = (title: string): string[] =>
  T.clean(title)
    .split(PIECES)
    .map((piece) => lemmaWords(piece).join(" "))
    .filter(Boolean);

// German, read once more when the second reading found nothing of ours. The small words between a
// title and its field go ("Vorarbeiter im Tiefbau" reads as "Vorarbeiter Tiefbau"), plural and
// female endings read as the singular ("Elektroingenieure", "Technikerin"), a word a hyphen leaves
// open takes the end of the word that closes the list ("Maschinen- und Anlagenmonteure", tried at
// every point, since only the index knows where the word joins), and a field listed after the first
// piece takes its title ("Vorarbeiter im Straßen- und Tiefbau" also reads "Vorarbeiter Tiefbau").
// The index's German titles are read the same way.
const DE_SMALL = new Set([
  "im",
  "in",
  "ins",
  "am",
  "an",
  "fur",
  "als",
  "zum",
  "zur",
  "bei",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "des",
  "mit",
  "von",
  "vom",
  "auf",
  "bereich",
  "fachbereich",
  "schwerpunkt",
]);
const deLemma = (word: string) =>
  word
    .replace(/(?<=[a-z]{2})(eur|or|er|ant|ent|ist)(?:innen|in)$/, "$1")
    .replace(/(?<=[a-z]{2})eure$/, "eur")
    .replace(/(?<=[a-z]{2})oren$/, "or")
    .replace(/(?<=[a-z]{2})(ant|ent|ist)en$/, "$1");
export const deWords = (text: string): string[] =>
  lemmaWords(text)
    .filter((word) => !DE_SMALL.has(word))
    .map(deLemma);
const OPEN = /[a-z0-9ß]{2,}-$/;
// A word's last thirty letters at most: a run of thousands, from a broken page, made this square
// (NOB-11).
const CLOSER_TRIED = 30;

export function germanReading(title: string): string[] {
  const raw = T.clean(title)
    .split(PIECES)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const pieces: string[] = [];
  raw.forEach((piece, at) => {
    const closer =
      OPEN.test(piece) &&
      /^[a-z0-9ß]+/.exec(
        raw.slice(at + 1).find((next) => !OPEN.test(next)) ?? "",
      )?.[0];
    if (!closer) {
      pieces.push(piece);
      return;
    }
    for (
      let k = Math.max(1, closer.length - CLOSER_TRIED);
      k <= closer.length - 3;
      k++
    )
      pieces.push(piece.slice(0, -1) + closer.slice(k));
  });
  const read = pieces.map((piece) => deWords(piece).join(" ")).filter(Boolean);
  const head = deWords(raw[0] ?? "")[0];
  const lent = head
    ? read
        .filter(
          (reading) =>
            reading.split(" ").length <= 3 &&
            !reading.split(" ").includes(head),
        )
        .map((reading) => `${head} ${reading}`)
    : [];
  return [...new Set([...read, ...lent])];
}

// Spanish, read once more when no reading found anything: a word ending in a consonant takes -es
// in the plural ("Soldadores", "Ingenieros civiles", "Desarrolladores web"), which the second
// reading, written for English, leaves as "soldadore". A plural of a word ending in -e only drops
// its s ("Responsables", "Detalles"). The index's Spanish titles are read the same way.
function esLemma(word: string): string {
  if (word.length <= 4) return word;
  if (/(?:bles|lles|ples|cles|gles|tles)$/.test(word)) return word.slice(0, -1);
  if (/[rldn]es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("ces")) return `${word.slice(0, -3)}z`;
  return /[aeiou]s$/.test(word) ? word.slice(0, -1) : word;
}
export const esWords = (text: string): string[] =>
  T.clean(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(esLemma);

// A Spanish title is cut where it lists or joins, but not at "en" ("Técnico en
// telecomunicaciones" is one title), and a role word followed straight by its field is also read
// with the "de" many adverts leave out ("Técnico calidad" as "técnico de calidad", "Operario
// mantenimiento").
const ES_PIECES = /[/,;|()[\]&+·–—]| - |(?<![a-z])(?:or|and|o|y|u)(?![a-z])/;
const ES_HEAD =
  /^(tecnico|tecnica|operario|operaria|administrador|administradora|oficial|oficiala|jefe|jefa|encargado|encargada|instalador|instaladora|montador|montadora) (?!de |del |en |y |o |para |a )(?=[a-z])/;
export const spanishReading = (title: string): string[] => [
  ...new Set(
    T.clean(title)
      .split(ES_PIECES)
      .map((piece) => esWords(piece).join(" "))
      .filter(Boolean)
      .flatMap((piece) =>
        ES_HEAD.test(piece)
          ? [piece, piece.replace(ES_HEAD, "$1 de ")]
          : [piece],
      ),
  ),
];
