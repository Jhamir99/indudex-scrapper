import { foldLetters, nameKey } from "../../shared/kit/fold.js";

// One employer under one key (legacy app/lib/company-key.ts, and builder/companies.mjs's
// cleanName and displayName): "Siemens AG", "SIEMENS" and "Siemens" are "siemens" (accents,
// capitals, a legal form at the end and "and" tell no employers apart).

export const LEGAL = new Set([
  "and",
  "und",
  "gmbh",
  "ag",
  "se",
  "kg",
  "kgaa",
  "ohg",
  "ug",
  "mbh",
  "co",
  "inc",
  "incorporated",
  "ltd",
  "limited",
  "llc",
  "llp",
  "plc",
  "corp",
  "corporation",
  "sa",
  "sas",
  "sasu",
  "sarl",
  "sl",
  "slu",
  "spa",
  "srl",
  "bv",
  "nv",
  "ab",
  "as",
  "asa",
  "oy",
  "oyj",
  "aps",
  "group",
  "gruppe",
  "groupe",
  "grupo",
  "holding",
  "holdings",
  // Spain's and Catalonia's (S.A.U., S.L.P., S.L.L., S.C.C.L., S.Coop., C.B.), and the rest of Europe's, Greek and
  // Bulgarian ones included.
  "sau",
  "slp",
  "sll",
  "sccl",
  "scoop",
  "cb",
  "sro",
  "spzoo",
  "kft",
  "zrt",
  "nyrt",
  "bt",
  "doo",
  "dd",
  "ek",
  "lda",
  "snc",
  "sci",
  "eurl",
  "vof",
  "αε",
  "επε",
  "ικε",
  "οε",
  "еоод",
  "оод",
  "ад",
]);
// The forms written before the name, in Russian and Ukrainian (ООО «Мегафон»).
const LEADING = new Set([
  "ооо",
  "оао",
  "ао",
  "пао",
  "зао",
  "тов",
  "пат",
  "прат",
]);

// A name's words, legal forms and all: "Schmidt & Co. GmbH" → schmidt, and, co, gmbh. Letters fold as a town's do
// («Ørsted» is «Orsted», «Weiß» «Weiss»), initials join in any alphabet (S.A.U., Α.Ε.), and no letter is lost.
export function nameWords(name: unknown): string[] {
  return foldLetters(String(name || ""))
    .replace(/&/g, " and ")
    .replace(/\bs\.\s?coop\b\.?/g, "scoop")
    .replace(/\bsp\.?\s?z\s?o\.?\s?o\b\.?/g, "spzoo")
    .replace(/\bspol\.?\s+s\s+r\.?\s?o\b\.?/g, "sro")
    .replace(/(?<![\p{L}\p{N}])(\p{L})\.(?=\p{L}\.)/gu, "$1")
    .replace(/(?<![\p{L}\p{N}])(\p{L})\/(\p{L})(?![\p{L}\p{N}])/gu, "$1$2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

// A name that names an employer: not one that hides it ("Confidencial", "our client"), and two letters at least
// ("0" is none). The Index lists only these, so only these link to it.
const HIDDEN =
  /^(confidential|anonymous|undisclosed|unknown|n\/?a|private|company|employer|client|our client|nuestro cliente|empresa|empresa confidencial|confidencial|vertraulich|anonym|soci[eé]t[eé]|entreprise|compagnie|firma|selskap)$/i;
export const usable = (name: string | null | undefined): name is string =>
  !!name && !HIDDEN.test(name) && /\p{L}.*\p{L}/u.test(name);

// The legal forms and joiners come off the end only («Müller GmbH & Co. KG» is müller), and the Russian ones off the
// front: elsewhere they are the name's own words («SAS Institute», «Groupe SEB», which is not the bank «SEB AB»).
export function companyKey(name: unknown): string {
  const words = nameWords(name);
  let start = 0,
    end = words.length;
  while (end > 1 && LEGAL.has(words[end - 1])) end--;
  while (end - start > 1 && LEADING.has(words[start])) start++;
  return words.slice(start, end).join(" ");
}

// A town's key, a district's number dropped ("Paris 13" and "Marseille 15eme" are Paris and Marseille).
export const townKey = (town: unknown): string =>
  nameKey(String(town || "")).replace(/ \d+(e|eme|er)?$/, "");

// An employer's name as shown: quotation marks around it ("QEMS" s.r.o.) go.
export const cleanName = (raw: unknown): string =>
  String(raw || "")
    .replace(/["“”«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// A register's name in capitals as people write it ("SANDNES ELEKTRISKE AS" → "Sandnes
// Elektriske AS"); legal forms, words of three letters (ABB, SKF) and names already in mixed case
// stay.
const PARTICLES: ReadonlySet<string> = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "og",
  "i",
  "y",
  "e",
  "del",
  "der",
  "und",
  "von",
  "van",
  "en",
  "of",
  "the",
  "and",
  "à",
  "au",
  "aux",
  "sur",
]);
export function displayName(name: string): string {
  if (/\p{Ll}/u.test(name)) return name;
  return name
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((w, i) => {
      const bare = w.replace(/[^\p{L}]/gu, "");
      if (LEGAL.has(bare) || (bare.length <= 3 && !PARTICLES.has(bare)))
        return w.toUpperCase();
      if (i > 0 && PARTICLES.has(bare)) return w;
      return w.replace(/\p{L}/u, (c) => c.toUpperCase());
    })
    .join("");
}
