import { fold } from "../../shared/kit/fold.js";

// A name as written without its hyphens, apostrophes or dots: «Aix en Provence», «s Hertogenbosch»,
// «St.Gallen» and «Stoke on Trent» are towns of the map (2,187 published offers named one so,
// 1 November 2026).
export const loose = (name: string): string =>
  fold(name)
    .replace(/[\s'’‐‑.-]+/g, " ")
    .trim();

// A piece that says it is a province or a region ("Barcelona provincia", "Province of Málaga"):
// the area, never the town of that name. Also Italy's «provincia di», Belgium's «Provincie»,
// Switzerland's «Kanton» and «canton de», Croatia's «županija» (about 2,500 published offers
// placed in no area for it, 7 November 2026).
const AREA_WORD_SOURCE = String.raw`(?<![\p{L}\d])(?:provincia(?: (?:de|di|del|della|dei|degli|delle))?|provincie|province(?: of)?|provinz|prov\.|kanton|canton(?: (?:de|du))?|županija|zupanija)(?![\p{L}\d])`;
const AREA_WORD = new RegExp(AREA_WORD_SOURCE, "iu");
const AREA_WORDS = new RegExp(AREA_WORD_SOURCE, "giu");

export const saysArea = (piece: string): boolean => AREA_WORD.test(piece);

// The area's name without its word for a province.
export const areaName = (piece: string): string =>
  piece.replace(AREA_WORDS, " ").replace(/\s+/g, " ").trim();
