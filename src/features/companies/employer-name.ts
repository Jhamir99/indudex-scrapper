import { withoutClutter } from "./clutter.js";

// What the name readers read of an advert.
export interface CompanyAdvert {
  readonly company?: string;
  readonly title?: string;
  readonly url?: string;
  readonly description?: string;
  readonly source?: string;
}

// The employer's name from an advert's company field (legacy builder/normalise.mjs and
// builder/lib/crawl.mjs's genericName, word for word but for types).

// A name that names no employer: TÜV SÜD's feed is titled "Jobs", Enercon's site came out as
// "Career", the Swiss federal administration's as "Bewerbung". Such a name is never shown.
const GENERIC_NAME =
  /^(?:jobs?|careers?|career site|hoofdkantoor|head ?office|headquarters|karriere(?:portal)?|stellen(?:angebote|anzeigen|markt|portal)?|offene stellen|job ?portal|jobb(?:ö|oe)rse|vacatures|vacancies|empleos?|trabaja con nosotros|emplois?|offres d'emploi|carri(?:e|è)res?|recrutement|lavora con noi|work with us|join us|home(?: ?page)?|startseite|accueil|inicio|welcome|willkommen|current openings|open positions|job openings|job search|search jobs|rss|feed|all jobs|alle jobs|recruiting|bewerbung(?:sportal)?|candidate portal|career portal|(?:jobs?|karriere) (?:&|und|and) (?:karriere|careers?|jobs?)|untitled|unknown|n\/a|null|undefined)$/i;
// Nor does one that carries an e-mail address or a phone number: that is a person's contact line
// (a site's "Geschäftsführer Tel.: +49 …" was once read as its name).
const CONTACT_LINE = /@|(?:\d[\s/().-]*){9}/;
export const genericName = (name: unknown): boolean => {
  const s = String(name || "")
    .replace(/[\s.:|·–—-]+$/, "")
    .trim();
  return !s || GENERIC_NAME.test(s) || CONTACT_LINE.test(s);
};
// An employer's name as a card shows it (29 October 2026): no sign before it (". AECOM Limited", "-->": 892), no
// Spanish tax number after it ("AXXON SELECTING ETT, S.L. B17383910": 79), no "Stellenangebote" or "Karriere bei"
// before it, no slogan after a dash ("BASF - At BASF, we offer…!"), no word that names no one ("EMPRESA"), and a
// long name cut at a word, never inside one (700 were cut inside a word at 80 letters).
// And a person's DNI or NIE, when the employer is a person: theirs is personal data (NOA-11).
const TAX_ID =
  /[,\s]+(?:(?:CIF|NIF|DNI|NIE):?\s*)?(?:[A-HJ-NP-SUVW]-?\d{7}[0-9A-J]|\d{8}-?[A-Z]|[XYZ]-?\d{7}-?[A-Z])$/u;
const OPENING =
  /^(?:stellenangebote\s+(?:bei\s+|von\s+)?|(?:stellen|karriere|jobs|careers?)\s+(?:bei|at|von|chez)\s+)/iu;
const SLOGAN =
  /\s[-–]\s(?=[^-–]*(?:!|\b(?:we|our|wir|unsere?|nous|notre|nuestr[oa]s?)\b)).*$/iu;
// Signs that only stand before a name, never in it: not quotes, brackets or the apostrophe of "'s Heeren Loo".
const LEADING_SIGNS = /^[\s\-–—:;,.|•·›»>/]+/u;
// A pay written where the name goes ("£22/hour") names no one, nor an Oracle site's number or tenant («CX 1003»,
// «Fa Etjb Saasfaprod1») where a site found by its address had no other name.
// Nor a country or a region where a site found by its address was named after its section («Spain», "EMEA"), nor a
// template's placeholder («Ihr Firmenname», "Your Company") or an address's «Info» (the readers of every kind of offer).
// Nor the department that hires («Personalabteilung», «Human Resources», «Recursos humanos»): the readers' faults.
const NO_ONE =
  /^(?:empresa|recruitment|company|entreprise|unternehmen|ihr firmenname|firmenname|your company|company name|bedrijfsnaam|info|personalabteilung|personalwesen|personalmanagement|human resources|hr|hr department|hr team|recruiting team|talent acquisition|ressources humaines|recursos humanos|rrhh|recursos humans|personeelszaken|hr-afdeling|risorse umane|confidential|confidentiel|confidencial|confidenziale|vertraulich|vertrouwelijk|anonymous|anonyme|anonimo|anoniem|undisclosed|not disclosed|non communiqu[ée]|nicht genannt)$|^[£€$]\s?\d|^cx[ _]?\d+$|saasfaprod\d|^(?:spain|poland|germany|france|italy|portugal|netherlands|belgium|austria|switzerland|sweden|norway|denmark|finland|ireland|united kingdom|uk|czechia|czech republic|hungary|romania|bulgaria|greece|croatia|slovakia|slovenia|serbia|lithuania|latvia|estonia|luxembourg|europe|emea|apac|global|international)$/iu;
// A job board's name where the employer goes: the employer's own portal keeps the employer («adesso Group
// Stellenportal», «Jobportal der Lechwerke», «Job Board Fresenius Kabi»); a board that hides the employer names none
// («Jobriver IT Jobbörse», 1,740 published offers; «MKK-Jobs - Stellenportal für den Main-Kinzig-Kreis»). An agency
// that is called so with its legal form stays («RADAS Jobbörse & Personalvermittlung GmbH»). 7 November 2026.
const BOARD_WORD =
  /(?:^|\s+)(?:[-–|&]\s*)?(?:job ?portal|stellenportal|job ?board|jobb(?:ö|o|oe)rse|stellenb(?:ö|o|oe)rse|vacaturebank|job ?site)(?:\s+(?:der|des|von|de|van|du))?(?=\s|$)/giu;
// Czech ones too («Jobs Contact Personal, s.r.o.» had lost its «Jobs»).
const BOARD_WORD_ANY = new RegExp(BOARD_WORD.source, "iu");
const LEGAL_FORM =
  /(?:^|[^\p{L}])(?:gmbh|ag|kg|ohg|se|ug|e\.?\s?v|ltd|limited|plc|b\.?v|n\.?v|s\.?a|s\.?l|srl|sas|sarl|s\.?p\.?a|ab|a\/s|oy|inc|llc|mbh|s\.\s?r\.\s?o|a\.\s?s)(?![\p{L}])/iu;
const withoutBoard = (s: string): string => {
  // Asked with a copy without state: the global one remembered where the last advert's match ended (NOA-15).
  if (!BOARD_WORD_ANY.test(s) || LEGAL_FORM.test(s)) return s;
  const left = s
    .split(/\s[-–]\s/)[0]
    .replace(BOARD_WORD, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[|–&,:\s-]+|[|–&,:\s-]+$/gu, "");
  // What is left names no employer when it is a country or the board says it serves a trade («Vacaturebank Nederland»,
  // «Azure Jobboard - Het platform voor Azure professionals»).
  const country =
    /^(?:nederland|deutschland|schweiz|(?:ö|o|oe)sterreich|belgi(?:e|ë|que)|france|espa(?:ñ|n)a|italia|europ[ae]|germany|netherlands|switzerland|austria|belgium|spain|italy|uk|united kingdom|ireland|polska|poland)$/i;
  return left.length < 3 ||
    /job/i.test(left) ||
    country.test(left) ||
    /platform (?:voor|for)|plattform f(?:ü|u)r/i.test(s)
    ? ""
    : left;
};
// A careers portal named after a place, on a site of its own name («Karriere Südtirol» on karriere-suedtirol.com,
// «Karriere Hennigsdorf»), and Absolventa's sector where it hides the employer («… bei Baugewerbe/-industrie
// Karriere», «Handwerk Karriere») name no employer (7 November 2026). Nor a field's board («Architektur Stellen»,
// architekturstellen.ch's name on its 306 published offers).
// easy-prace.cz, a board, came as the employer of every advert it lists (2,275 published offers, 8 November 2026): the
// employer its page title names, which the text opens with («Procesní inženýr / Technolog u O.K. solution, s.r.o.,
// Jihlava | Easy-práce.cz»), up to its legal form where more towns follow («Advantage Consulting, s.r.o., Praha, Brno»),
// else all but the town.
const CZ_LEGAL_END =
  /(?:s\.\s?r\.\s?o\.?|a\.\s?s\.|v\.\s?o\.\s?s\.|k\.\s?s\.|s\.\s?p\.|z\.\s?s\.|z\.\s?ú\.|o\.\s?p\.\s?s\.|státní (?:organizace|podnik)|GmbH|Ltd\.?|SE)$/u;
const easyPraceEmployer = (raw: CompanyAdvert): string => {
  const head = String(raw.description || "").split(" | Easy-práce.cz")[0],
    title = String(raw.title || "").trim();
  const rest = head.startsWith(title + " u ")
    ? head.slice(title.length + 3)
    : (head.match(/^.+? u (.+)$/u) || [])[1];
  const parts = String(rest || "").split(", ");
  if (parts.length < 2) return "";
  for (let k = 1; k < parts.length; k++)
    if (CZ_LEGAL_END.test(parts.slice(0, k).join(", ")))
      return parts.slice(0, k).join(", ");
  return parts.slice(0, -1).join(", ");
};
// A name that reads as a job: its words for one, or a gender mark («(w/m/d)»).
const JOB_NAME =
  /(?<![\p{L}])(?:engineers?|technicians?|managers?|attendants?|operators?|fitters?|electricians?|welders?|mechanics?|planners?|designers?|developers?|consultants?|supervisors?|ingenieure?|techniker|monteure?|elektriker|mechaniker|mitarbeiter|technicien|ingénieur|ingeniero|técnico)(?![\p{L}])|\((?:[mwfdhx]\s*\/\s*){2}[mwfdhx]\)/iu;
export function companyOfAdvert(raw: CompanyAdvert): string {
  const said = String(raw.company || "").trim();
  if (/^easy-pr[aá]ce\.cz$/iu.test(said))
    return companyName(easyPraceEmployer(raw));
  // A reader that took the title for the employer names none («Fire and Security Engineer» as the company of
  // 4wayrecruitment.co.uk's «Fire and Security Engineer»: 94 published offers, 8 November 2026); not where the name is
  // the site's own, and the title is what is wrong («HUBER+SUHNER» on hubersuhner.com).
  // Only a name that reads as a job and has no legal form: a title that is the company's name is what is wrong there
  // («Deloitte GmbH», «Stadt Schorndorf»).
  if (
    said &&
    letters(said) === letters(raw.title) &&
    JOB_NAME.test(said) &&
    !LEGAL_FORM.test(said)
  ) {
    let host;
    try {
      host = letters(new URL(raw.url ?? "").hostname);
    } catch {
      host = "";
    }
    if (!host.includes(letters(said))) return "";
  }
  if (raw.source === "absolventa.de" && /\skarriere$/iu.test(said)) return "";
  if (/^[\p{L}-]+\s+stellen$/iu.test(said)) return "";
  if (/^karriere\s/iu.test(said)) {
    let host;
    try {
      host = new URL(raw.url ?? "").hostname;
    } catch {
      host = "";
    }
    if (/karriere/i.test(host.split(".").slice(-2).join("."))) return "";
  }
  return companyName(said);
}
// A company named by a label of its advert's address («Froewag» for froewag.de, «Fastlta» for fastlta.jobs.personio.de,
// «Igh» for igh.recruitee.com) as the advert's own text writes it: the same letters, case, umlauts and spaces aside
// («Fröwag», «FAST LTA», «IG&H»). Only where the text's way says more: an accent, an umlaut, a ß or an &; words the
// address ran together («Landschaften und Gärten»); a short name's capitals («TSMG»); a capital the label lacked
// («dekimo»). Never a name in capitals throughout nor one that starts small («HEIDELBERG», «mikrolab»). Of 223,893
// published offers named so, the text wrote 24,374 another way, more than half of them only in capitals (7 November 2026).
const letters = (s: unknown): string =>
  String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
const marks = (s: string): number =>
  // oxlint-disable-next-line no-control-regex -- every letter outside plain ASCII counts
  (String(s).match(/[^\x00-\x7f]|&/g) || []).length;
export function spelledCompany(
  name: string,
  url: string,
  text: string,
): string {
  const k = letters(name);
  if (k.length < 2) return name;
  let labels;
  try {
    const u = new URL(url);
    labels = [...u.hostname.split("."), ...u.pathname.split("/")].map(letters);
  } catch {
    return name;
  }
  if (!labels.includes(k)) return name;
  // The text as written between the words, so «Kühne + Nagel» and «C.R. Nordhoff» keep their signs; never across a line.
  // Only a text that holds the name's letters at all, each word's letters worked out once: read so for every advert,
  // the publication of 7 November 2026 at noon took 8.5 minutes more over its store.
  const all = String(text || "");
  if (!letters(all).includes(k)) return name;
  const words = [...all.matchAll(/[\p{L}\d][\p{L}\d&'’.-]*/gu)],
    plain: string[] = [];
  const plainOf = (i: number): string => (plain[i] ??= letters(words[i][0]));
  const seen = new Map();
  for (let i = 0; i < words.length; i++) {
    if (words[i][0][0].toLowerCase().normalize("NFD")[0] !== k[0]) continue;
    let joined = "";
    for (
      let j = i;
      j < Math.min(words.length, i + 4) && joined.length < k.length;
      j++
    ) {
      joined += plainOf(j);
      if (joined !== k) continue;
      const said = all
        .slice(words[i].index, words[j].index + words[j][0].length)
        .replace(/[.'’-]+$/u, "");
      const key = said.replace(/ {2,}/g, " "); // read and written under the same key (NOA-24)
      if (/^[\p{L}\d&+'’. /-]+$/u.test(said))
        seen.set(key, (seen.get(key) || 0) + 1);
    }
  }
  const said = [...seen].toSorted((a, b) => b[1] - a[1])[0]?.[0];
  if (!said || said === name || /^\p{Ll}/u.test(said)) return name;
  if (
    said === said.toUpperCase() &&
    said
      .split(/\s+/)
      .some((w: string) => w.replace(/[^\p{L}]/gu, "").length > 4)
  )
    return name;
  const more =
    marks(said) > marks(name) ||
    said.split(/\s+/).length > name.split(/[\s]+/).length ||
    (/^\p{Lu}\p{Ll}{1,3}$/u.test(name) && said === said.toUpperCase()) ||
    /^\p{Ll}/u.test(name);
  return more ? said : name;
}
// «Karriere» set before or after an employer's name is its careers site's word, not the name («LIST Karriere»,
// «Karriere - Kernkraftwerk Gösgen-Däniken AG», «batec group GmbH | Karriere»: 7 November 2026).
const withoutKarriere = (s: string): string => {
  const left = s
    .replace(/^karriere(?:\s*[-–|:]\s*|\s+)/iu, "")
    .replace(/(?:\s*[-–|:]\s*|\s+)karriere$/iu, "")
    .trim();
  // What is left that speaks to the reader is a portal's slogan («Karriere In Brandenburg», «Mein Studium Karriere»).
  if (left !== s && /^(?:in|mein|meine|dein|deine|your|my)\s/iu.test(left))
    return "";
  return left.length >= 2 ? left : s;
};
export function companyName(raw: unknown): string {
  let s = withoutClutter(
    String(raw || "")
      .replace(/\s+/g, " ")
      .trim(),
    { phones: false },
  )
    .replace(/[™®©]/g, "")
    .replace(LEADING_SIGNS, "")
    .replace(TAX_ID, "")
    .replace(OPENING, "")
    .replace(SLOGAN, "")
    .replace(/\s*[-–—]\s*$/u, "");
  s = s
    .split(/\s\/\s/)
    .filter(
      (part, i) => i === 0 || !/karriere|stellen|jobs|careers/iu.test(part),
    )
    .join(" / ")
    .trim();
  s = withoutJobsWord(withoutKarriere(withoutBoard(s)));
  if (s.length > 120) s = s.slice(0, 121).replace(/\s+\S*$/u, "");
  return genericName(s) || NO_ONE.test(s) || NO_EMPLOYER.test(s) ? "" : s;
}
// A careers site's word for jobs around the employer's name («Jobs Schaffenberger», «Jobs.BAM.com», «Jobs - Implenia»,
// «Jobs Worldwide | Atlas Copco Group», «Jobs und Karriere bei Schwarz», «JS Engineering (sjabloon vacatures)», «WR
// Vacatures»): 1,400 published offers, 7 November 2026.
// «Jobs» only, never «Job», which opens brands («Job Link», «Job 4 You AG»), nor a name with its legal form («Jobs VS
// GmbH»); what is left starts with a capital («Jobs in Mind» stays), and a slogan before the name goes («Jobs - Grow
// with us | Yara International»).
const withoutJobsWord = (s: string): string => {
  if (LEGAL_FORM.test(s)) return s;
  let left = s
    .replace(
      /^jobs\.([\p{L}\d-]+)\.(?:com|de|nl|be|fr|ch|at|eu|net|org|co\.uk)$/iu,
      (m: string, name: string) =>
        name.length <= 4 ? name.toUpperCase() : name,
    )
    .replace(
      /^[Jj]obs(?:\s+(?:[Ww]orldwide|und [Kk]arriere bei|at|bei|@))?(?:\s*[-–|:]\s*|\s+)(?=\p{Lu})/u,
      "",
    )
    .replace(/\s*\((?:sjabloon )?vacatures?\)$|\s*[-–|:]?\s+vacatures?$/iu, "")
    .trim();
  if (left !== s && left.includes(" | "))
    left = (left.split(" | ").at(-1) ?? "").trim();
  // Not what is left of a board's own line («Jobs for Indeed», «Jobs & Stellenangebote»), which NO_EMPLOYER takes whole.
  return left.length >= 2 && /^[\p{L}\d]/u.test(left) && !/^for\s/iu.test(left)
    ? left
    : s;
};
// A board's line where the employer goes, naming none: a month («for October 2026», freelancer.cz), a company size
// («Medium»), a sector of employers («Technology & Software Employers in Bulgaria»), the board («Construction Employer via
// SiteJobs», «Construct AI UK Platform», «Jobs for Indeed», «Das kommt aus Bielefeld»), a job offer («oferta pracy IT»),
// or a template's field («1_Standard»): 8,000 published offers, 7 November 2026.
const NO_EMPLOYER =
  /^(?:for \p{L}+ \d{4}|medium|small|large|1_standard|jobs for indeed|jobs & stellenangebote|job (?:page|feed|offers?\b.*)|ofert[ay] pracy\b.*|das kommt aus \p{L}+)$|employers? (?:from|in) |\bemployer via\b|\b(?:career|careers|job|jobs|startup|uk|recruitment|talent) platform$|^(?:technology|professional services|engineering|manufacturing)[^,]* employers?\b/iu;
