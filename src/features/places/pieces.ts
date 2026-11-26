import { fold } from "../../shared/kit/fold.js";
import { loose } from "./names.js";

// Words around a town that are not the town ("Getafe Area", "Office Eschborn", "BLOIS PLANT",
// «Cambridge Science Park»).
const AROUND =
  /(?<![\p{L}\d])(?:science park|technology park|research park|industrial estate|trading estate|gewerbegebiet|industriegebiet|area|office|offices|hq|headquarters|campus|site|plant|hub|region|regio|greater|metro|hauptsitz|standort|zentrale|werk|sede|oficina|oficinas|bureau|bureaux|siège|siege|kantoor|vestiging)(?![\p{L}\d])/giu;

const withoutAround = (piece: string): string =>
  piece.replace(AROUND, " ").replace(/\s+/g, " ").trim() || piece;

// The pieces a place is written in ("08940 Cornellà de Llobregat, Barcelona provincia"), each
// without its postcode or the words around a town that are not the town.
export function pieces(text: string): string[] {
  return text
    .split(/[,;/|()]|\s[-–]\s/)
    .map((piece) =>
      withoutAround(
        piece
          .replace(/\b[\d-]*\d[\d-]*\b/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    )
    .filter(Boolean);
}

// Not a point of the compass, which names a region with what follows it: «Noord-Limburg»,
// «Noord-Brabant» and «Noord-Nederland» were Amsterdam-Noord (96 published offers, 7 November 2026).
const COMPASS =
  /^(?:noord|zuid|oost|west|nord|süd|sud|ost|north|south|east|midden|mitte)$/i;

// A French district named small or great of its town, which the map has not («Petit-Lancy» is
// Lancy's: 77 published offers, 8 November 2026): the town after it too.
const PART_OF = /^(?:petit|petite|grand|grande)-(\p{Lu}.+)$/iu;

// A piece, and the town it may hold: a district after a hyphen ("Ulm-Jungingen" is Ulm's), a
// French district small or great of its town.
export function withTown(piece: string): string[] {
  const before = piece.split("-")[0] ?? "";
  const out =
    piece.includes("-") && !COMPASS.test(before) ? [piece, before] : [piece];
  const part = piece.match(PART_OF)?.[1];
  return part ? [...out, part] : out;
}

// A town behind codes in capitals, joined by hyphens or an underscore («OCONUS-UK-Warrington»,
// «DE_Ulm»: 33 published offers, 8 November 2026), tried after the place's other pieces
// («GE-Hannover (Langenhagen)» is Langenhagen).
const BEHIND_CODES = /^(?:(?:OCONUS|[A-Z]{2,4})[-_])+(\p{Lu}[\p{L}' .-]{2,})$/u;

export const behindCodes = (piece: string): string | undefined =>
  piece.match(BEHIND_CODES)?.[1];

// Words the map holds as a district or a building but no visitor means as a town alone (NOB-10).
export const NOT_ALONE: ReadonlySet<string> = new Set([
  "sur",
  "nord",
  "norte",
  "sud",
  "centro",
  "centre",
  "center",
  "zentrum",
  "mitte",
  "headquarters",
  "none",
  "office",
  "hq",
]);

// A saint's name cut short («St Denis», «Ste Foy», «Sta. Perpètua de Mogoda», NOB-06).
const SAINT_SHORT = /^(sts?|stes?|sta)\.?[\s-]+(\p{L}.*)$/iu;
const SAINT_FULL: Readonly<Record<string, string>> = {
  st: "saint",
  sts: "saints",
  ste: "sainte",
  stes: "saintes",
  sta: "santa",
};

// The saint's name in full, loosely: «St» is «Saint», and in German «Sankt», in Catalan «Sant»,
// in Spanish and Italian «San».
export function saintNames(piece: string): string[] {
  const match = piece.match(SAINT_SHORT);
  if (!match) return [];
  const word = (match[1] ?? "").toLowerCase();
  const rest = match[2] ?? "";
  const full = [
    SAINT_FULL[word] ?? word,
    ...(word === "st" ? ["sankt", "sant", "san"] : []),
  ];
  return full.map((name) => loose(`${name} ${rest}`));
}

// A German town with the place it lies by or on, which the map has not in its name («Ergolding
// bei Landshut», «Mainz am Rhein», «Weiden in der Oberpfalz», «Kernen im Remstal»).
const BY_PLACE =
  /^(\p{Lu}[\p{L}.-]*(?:\s\p{Lu}[\p{L}.-]*)?)\s+(bei|b\.|am|an der|im|in der|ob der|vor der|auf der)\s+(\p{Lu}.*)$/u;

export interface ByPlace {
  readonly town: string;
  readonly word: string;
  readonly near: string;
}

export function byPlace(piece: string): ByPlace | undefined {
  const match = piece.match(BY_PLACE);
  if (!match) return undefined;
  return { town: match[1] ?? "", word: match[2] ?? "", near: match[3] ?? "" };
}

// Spain's register writes a town's article after it, as its lists sort («ALDEA, L'», «Garriga,
// La», «Coruña, A»): the town whole, where the map knows it so («La Garriga»), or where the
// article is an elided one, which is never a code («L'Aldea», a town too small for the map). 89
// published offers, 7 November 2026. «Asturias, AS» is a code, and stays (the legacy's 077eb06c).
const ARTICLE_AFTER =
  /^([^,]+?),\s*(l['’]|el|la|els|les|los|las|lo|o|a|os|as)\s*(?=,|$)/iu;

export function withArticle(
  location: string,
  knows: (name: string) => boolean,
): string {
  const match = location.match(ARTICLE_AFTER);
  if (!match) return location;
  const article = (match[2] ?? "").replace("’", "'");
  const name = (match[1] ?? "").trim();
  const elided = article.endsWith("'");
  const town = elided ? article + name : `${article} ${name}`;
  return elided || knows(fold(town)) || knows(loose(town))
    ? town + location.slice(match[0].length)
    : location;
}
