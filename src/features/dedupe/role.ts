import { fold } from "../../shared/kit/fold.js";
import { catalanToo } from "../../shared/words/catalan.js";

// The role an advert is: its company read as one name and its title, compared across sources
// (legacy builder/dedupe.mjs companyOf and jobKey, with Argus v1.11.0's titleKey and roleKey,
// server-bot/text.mjs and server-bot/scan.mjs; word for word but for types).

// A title reduced to what identifies the role, for telling a re-post from a new vacancy: gender
// tags ("(m/w/d)", "(x w m)", "(all genders)") and schedules ("80-100%") go, dashes are unified,
// whitespace collapsed, trailing punctuation dropped. Case is lowered but accents kept: a key is
// only compared with a key built the same way. The gender-tag pattern has no ambiguous
// repetition: an optional separator backtracks exponentially on "(m m m m …" with no closing
// paren; separators are one mandatory run, and a fused "(mwd)" has its own branch.
export function titleKey(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(
      /\(\s*(?:[mwfdxhv](?:[\s/|,.]+[mwfdxhv])+|[mwfdxhv]{2,}|all\s*genders?|gn)\s*\)/gi,
      " ",
    )
    .replace(/\b\d{2,3}\s*[-–]\s*\d{2,3}\s*%|\b\d{2,3}\s*%/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[\s,.;:-]+$/, "")
    .trim();
}

// The entities a board leaves in a field, decoded, so "Automation &amp; Controls Engineer" and
// "Automation & Controls Engineer" are one title; repeated until it settles ("&amp;amp;"),
// bounded at three.
function decodeFieldEntities(s: string): string {
  let out = String(s || "");
  for (let pass = 0; pass < 3; pass++) {
    const before = out;
    out = out
      .replace(/&(?:amp|#38);/gi, "&")
      .replace(/&(?:nbsp|#160);/gi, " ")
      .replace(/&(?:quot|#34);/gi, '"')
      .replace(/&(?:apos|#39|rsquo|lsquo);/gi, "'")
      .replace(/&(?:lt|#60);/gi, "<")
      .replace(/&(?:gt|#62);/gi, ">")
      .replace(/&(?:ndash|#8211);/gi, "-")
      .replace(/&(?:mdash|#8212);/gi, "—");
    if (out === before) break;
  }
  return out;
}

// Names that are not an employer: Adzuna hides the advertiser on plenty of adverts, and LinkedIn
// writes its own name when the advert names nobody; every anonymous "Offshore Engineer" of a
// country would share one key. No key means no role to join by; the address still joins copies.
export const NOT_AN_EMPLOYER = new Set(["", "adzuna", "linkedin"]);

// Gender tags and schedules that vary between postings go (titleKey), entities first.
const norm = (s: string) => titleKey(decodeFieldEntities(String(s)));

export function roleKey(company: string, title: string): string {
  const who = norm(company);
  if (NOT_AN_EMPLOYER.has(who)) return "";
  return `${who}::${norm(title)}`;
}

// A company as one name however a source writes it: an ATS's code before it, the words after
// it that name no one (a legal form, the country, "Group", a careers page's word, a web
// ending) and the spaces go: "3530 Kyndryl España, S.A.U.", "Sopra Steria ES", "Roche Ext",
// "Back Market" are kyndryl, soprasteria, roche, backmarket. What roleKey reads as no name
// ("(m/w/d)") stays none. A number before one word that names no one is the name's own («360 Consulting»), and a name
// is never cut down to a word that names no one («The Company», «The Group»: NOA-23).
const CODE = /^(?:\d{3,5}|[A-Z]{2}\d{2})\s+(?=\S)/;
const GENERIC = new Set([
  "consulting",
  "consultants",
  "vision",
  "solutions",
  "services",
  "systems",
  "engineering",
  "technologies",
  "technology",
  "tech",
  "digital",
  "energy",
  "group",
  "jobs",
  "media",
  "design",
  "software",
  "industries",
]);
const HEAD = new Set(["the", "grupo", "group"]);
const TAIL = new Set([
  "s a",
  "s a u",
  "s l",
  "s l u",
  "s l l",
  "s c c l",
  "sa",
  "sau",
  "sl",
  "slu",
  "sll",
  "sccl",
  "b v",
  "bv",
  "n v",
  "nv",
  "s p a",
  "spa",
  "s r l",
  "srl",
  "s a s",
  "sas",
  "ltd",
  "limited",
  "inc",
  "plc",
  "gmbh",
  "ag",
  "llc",
  "corp",
  "corporation",
  "co",
  "company",
  "holding",
  "group",
  "grupo",
  "es",
  "spain",
  "espana",
  "iberia",
  "iberica",
  "europe",
  "careers",
  "career",
  "jobs",
  "ext",
  "com",
  "eu",
  "io",
  "net",
  "org",
]);
const nameWords = (name: string) =>
  fold(titleKey(name))
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
function companyWords(name: string): string[] {
  const plain = String(name || "").replace(/&#?\w+;/g, " ");
  const bare = nameWords(plain.replace(CODE, ""));
  const words =
    bare.length === 1 && GENERIC.has(bare[0]) ? nameWords(plain) : bare;
  for (let cut = true; cut;) {
    cut = false;
    for (let n = 4; n >= 1 && !cut; n--) {
      if (
        words.length > n &&
        TAIL.has(words.slice(-n).join(" ")) &&
        !(words.length - n === 1 && HEAD.has(words[0]))
      ) {
        words.splice(-n);
        cut = true;
      }
    }
    if (
      words.length > 1 &&
      HEAD.has(words[0]) &&
      !(words.length === 2 && TAIL.has(words[1]))
    ) {
      words.shift();
      cut = true;
    }
  }
  return words;
}
export const companyOf = (name: string): string => companyWords(name).join("");

const titleOf = (advert: {
  readonly title: string;
  readonly language?: string | undefined;
}): string =>
  catalanToo({ title: advert.title, lang: advert.language ?? "" })?.title ??
  advert.title;

// The role a record is: its company so read and its title, a Catalan title as catalanToo
// reads it in Spanish, so "Tècnic/a de manteniment" and "Técnico/a de mantenimiento" are one.
export const jobKey = (
  advert: {
    readonly company: string;
    readonly title: string;
    readonly language?: string | undefined;
  },
  company = companyOf(advert.company),
  title = titleOf(advert),
): string => roleKey(company, title);

// Words after an employer's name that name no one else: its trade, its legal form, its country or its region (the
// legacy's 3c5b128e).
const EUROPE = [
  "de",
  "at",
  "ch",
  "fr",
  "be",
  "nl",
  "lu",
  "gb",
  "ie",
  "es",
  "pt",
  "it",
  "pl",
  "cz",
  "se",
  "no",
  "dk",
  "fi",
];
const COUNTRY_WORDS = ["en", "de", "fr", "nl", "es", "sv"].flatMap((lang) => {
  const names = new Intl.DisplayNames([lang], { type: "region" });
  return EUROPE.flatMap((code) =>
    nameWords(names.of(code.toUpperCase()) ?? ""),
  );
});
const NAMES_NO_ONE = new Set([
  ...[...TAIL].flatMap((tail) => tail.split(" ")),
  ...GENERIC,
  ...COUNTRY_WORDS,
  ...EUROPE,
  "uk",
  "europa",
  "zentraleuropa",
  "benelux",
  "dach",
  "nordics",
  "emea",
  "global",
  "international",
  "office",
  "interim",
  "construct",
  "job",
  "hr",
  "for",
  "people",
  "en",
  "and",
  "und",
  "recruitment",
  "recruiting",
  "staffing",
  "professional",
  "professionals",
  "talent",
  "personal",
  "personalmanagement",
  "zeitarbeit",
  "uitzendbureau",
  "uitzendkantoor",
  "aktiebolag",
  "kg",
  "mbh",
]);

export interface FamilyAdvert {
  readonly company: string;
  readonly title: string;
  readonly language?: string | undefined;
  readonly city?: string | undefined;
  readonly place: string;
}

// Each advert's role, its company read as the shortest name its copies go by: an employer that posts the same title in
// the same place under its name and under that name with words that name no one else is one employer posting one
// advert («Vivaldis» and «Vivaldis Interim», «Sopra Steria» and «Sopra Steria France», «Accent» and «Accent Jobs for
// People NV», «Actief Construct» and «Actief Construct Waregem» in Waregem: about 16,000 copies on the legacy's site on
// 23 November 2026). A name of its own after it is another employer («Indra Avitech»). The legacy's `familyNames`.
export function familyRoles<A extends FamilyAdvert>(
  adverts: Iterable<A>,
): Map<A, string> {
  const read = new Map<A, { words: string[]; title: string; role: string }>();
  const byRole = new Map<string, Set<string>>();
  for (const advert of adverts) {
    const words = companyWords(advert.company);
    const title = titleOf(advert);
    const role = `${titleKey(title)}@${advert.place}`;
    read.set(advert, { words, title, role });
    byRole.set(
      role,
      (byRole.get(role) ?? new Set<string>()).add(words.join(" ")),
    );
  }
  const roles = new Map<A, string>();
  for (const [advert, { words, title, role }] of read) {
    const names = byRole.get(role) ?? new Set<string>();
    let shortest = words;
    // Most names are their title's only one in their place: the place's own words are read only for the rest.
    if (names.size > 1) {
      const here = new Set(nameWords(`${advert.city ?? ""} ${advert.place}`));
      for (let n = 1; n < words.length; n++)
        if (
          names.has(words.slice(0, n).join(" ")) &&
          words
            .slice(n)
            .every((word) => NAMES_NO_ONE.has(word) || here.has(word))
        ) {
          shortest = words.slice(0, n);
          break;
        }
    }
    roles.set(advert, jobKey(advert, shortest.join(""), title));
  }
  return roles;
}
