import { load } from "cheerio";
import { DESCRIPTION_LIMIT } from "../schemas/advert.js";

const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, div, tr, dd, dt, blockquote";
// A description sent as escaped HTML ("&lt;p&gt;", common in JSON-LD) only shows its tags once
// the entities are decoded, so it takes a second pass. Only real tags trigger it: "< 50 people" stays.
const ESCAPED_TAG =
  /<\/?(?:p|br|div|li|ul|ol|strong|b|em|i|u|span|h[1-6]|table|tr|td|a)\b[^<>]*>/i;

function textOf(html: string): string {
  const $ = load(html, null, false);
  $("script, style, noscript, template").remove();
  $("br").replaceWith("\n");
  $(BLOCKS).append("\n");
  return $.root().text();
}

function tidy(text: string): string {
  return (
    text
      .split("\n")
      // The space before punctuation goes, as the legacy's text() takes it off («patrimoine : » is «patrimoine: »).
      .map((line) =>
        line
          .replace(/\s+/g, " ")
          .replace(/ +([.,;:!?])/g, "$1")
          .trim(),
      )
      .filter(Boolean)
      .join("\n")
  );
}

// An advert's text from its HTML: entities decoded, scripts and tags removed, a line break where
// the markup had one, capped at the advert's description limit.
export function pageText(html: string, limit = DESCRIPTION_LIMIT): string {
  // A broken page can hold a whole list of vacancies; there is no need to parse all of it.
  let text = textOf(html.slice(0, 4 * limit));
  if (ESCAPED_TAG.test(text)) text = textOf(text);
  return tidy(text).slice(0, limit);
}

// The same on one line, for titles, employers and places.
export function plainText(html: string, limit = DESCRIPTION_LIMIT): string {
  return pageText(html, limit).replace(/\n/g, " ");
}

// Words the trades write in capitals whatever the sentence, besides any word with no vowel
// (PLC, CNC, PRL).
const ACRONYMS = new Set(
  "SAP ERP HVAC BIM CAD CAM TIC IT IOT PLC CNC SCADA MES QA QC I+D R+D UX UI TIG MIG MAG".split(
    " ",
  ),
);

// A text a source writes all in capitals ("TECNICO PLC SIEMENS") as a sentence, its acronyms kept
// ("Tecnico PLC siemens").
export function sentenceCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{L}+]+/gu, (word, at: number) => {
      const original = text.slice(at, at + word.length);
      return original.length > 1 &&
        original === original.toUpperCase() &&
        (ACRONYMS.has(original) || !/[AEIOUYÁÉÍÓÚÀÈÒÏÜ]/.test(original))
        ? original
        : word;
    })
    .replace(/^\p{L}/u, (letter) => letter.toUpperCase());
}

// A line some sources write all in capitals ("ADDETTO ALLA CONTABILITÀ") as a sentence; a line
// with any small letter is kept as written.
export function fromCapitals(line: string): string {
  return line === line.toUpperCase() ? sentenceCase(line) : line;
}

// Names some sources write in capitals ("SINT-NIKLAAS", "mons") with a capital at the start of
// each word.
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    );
}
