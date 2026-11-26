import { anyOf, words as conceptWords } from "../../shared/words/index.js";
// Towns an advert's text gives, for a place that names no town (FR-6). Each is only a candidate:
// placing tries it against the map in the advert's country, so a word that is no town of the
// country counts for nothing.

// The form each country writes its postcodes in.
const POSTCODE: Readonly<Record<string, string>> = {
  de: String.raw`(?:D-)?\d{5}`,
  fr: String.raw`\d{5}`,
  es: String.raw`\d{5}`,
  it: String.raw`\d{5}`,
  fi: String.raw`\d{5}`,
  at: String.raw`(?:A-)?\d{4}`,
  ch: String.raw`(?:CH-)?\d{4}`,
  be: String.raw`(?:B-)?\d{4}`,
  dk: String.raw`(?:DK-)?\d{4}`,
  no: String.raw`\d{4}`,
  lu: String.raw`(?:L-)?\d{4}`,
  nl: String.raw`\d{4} ?[A-Z]{2}`,
  pl: String.raw`\d{2}-\d{3}`,
  pt: String.raw`\d{4}-\d{3}`,
  cz: String.raw`\d{3} ?\d{2}`,
  sk: String.raw`\d{3} ?\d{2}`,
  se: String.raw`\d{3} ?\d{2}`,
};

// Each linking word whole («del» is not «de» and an «l»), the Catalan, Spanish and Portuguese ones
// too, and «d'» and «l'» glued to the next name; a lower-case word after a hyphen («Vila-seca»).
// «08100 Mollet del Vallès» was Mollet de Peralada (NO1-02).
const LINKING = String.raw`(?:an|am|im|in|bei|beim|b\.|ob|unter|auf|vor|vorm|zum|zur|der|die|den|dels|del|de|els|el|la|las|los|les|le|sur|sous|en|di|aan|op|nad|pod|i|y|do|da|dos|das)(?![\p{L}.])`;
const NAME_WORD = String.raw`(?:[dl]['’])?\p{Lu}[\p{L}'’.]*`;
// A Catalan town's article, as the map writes it («la Garriga», «l'Escala», «els Hostalets de Pierola»).
const ARTICLE = String.raw`(?:(?:el|els|la|les)\s+(?=\p{Lu}))?`;
// A saint's word alone is no town («Sant Cugat» is not «Sant»).
const SAINT =
  /^(?:Sant|San|Santa|Santo|Saint|Sainte|St\.?|Ste\.?|Sankt|São|Sao)$/u;
const ENDS_LINKING = new RegExp(String.raw`(?:[ -]${LINKING})+$`, "u");
const POSTCODE_TOWN = new Map(
  Object.entries(POSTCODE).map(([country, code]) => [
    country,
    new RegExp(
      String.raw`(?<![\p{L}\d-])${code}\s+(${ARTICLE}${NAME_WORD}(?:-\p{Ll}+(?![\p{L}'’]))?(?:[ -](?:${NAME_WORD}|${LINKING}))*)`,
      "gu",
    ),
  ]),
);

// The towns a text writes with their postcode («63456 Hanau», «64-100 Leszno», «D-84579
// Unterneukirchen», «2511 CV Den Haag»), in the country's postcode form: the capitalised words
// after the code, up to the line's next mark, and the first of them alone («Bernau b. Berlin»).
// Three at most, in the order written. The legacy's readers found 50 of 193 employers' sites
// with a country and no town on the card (6 November 2026).
export function postalTowns(text: string, country: string): string[] {
  const pattern = POSTCODE_TOWN.get(country);
  if (!pattern) return [];
  const out: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const whole = (match[1] ?? "")
      .replace(/[\s.-]+$/u, "")
      .replace(ENDS_LINKING, "");
    const first =
      whole.replace(/^(?:el|els|la|les)\s+/iu, "").split(/[ -]/)[0] ?? "";
    for (const town of [whole, SAINT.test(first) ? "" : first])
      if (town && !out.includes(town)) out.push(town);
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

// The labels of a line that gives the job's own place, and those that may give an employer's
// site: an agency's or a client's job takes only the first («Einsatzort»), not «Standort», which
// may be the agency's branch (a town the text gave was missing on 13 % of the German offers the
// legacy's readers read, 1 November 2026).
const JOB_PLACE =
  "arbeitsort|einsatzort|dienstort|arbeitsplatz|work location|job location|place of work|lieu de travail|lugar de trabajo|centro de trabajo|werklocatie|standplaats|luogo di lavoro|sede di lavoro|miejsce pracy";
const SITE_PLACE =
  "standort|location|ort|ubicación|ubicacion|localización|localizacion|lieu|localisation|locatie|plaats|sede";
const placeLine = (labels: string) =>
  new RegExp(String.raw`^[\s•·*–-]*(?:${labels})\s*:\s*(.{2,60})$`, "gimu");
const JOB_LINE = placeLine(JOB_PLACE);
const ANY_LINE = placeLine(`${JOB_PLACE}|${SITE_PLACE}`);

// A Czech or Slovak board's caption with its town after it, in a text read flat, with no colon
// («Lokalita Jihlava a další Úvazek Plný úvazek»: 1,156 published offers with no town, 8 November
// 2026). Not the country («Lokalita Česká republika» was the village of Česká).
const CAPTION =
  /(?<![\p{L}])(?:Lokalita|Místo výkonu práce|Miesto výkonu práce|Místo pracoviště|Pracoviště)\s*:?\s+(?!(?:Česká|Slovenská)\s+republika|Slovensko(?![\p{L}]))(\p{Lu}[\p{L}-]*(?:\s+(?:(?:nad|pod|na|u|v|ve)\s+)?\p{Lu}[\p{L}-]*){0,3})/gu;

// The town a labelled line gives («Arbeitsort: Lüdenscheid», "Job location: Leeds", «Lieu de
// travail : Lyon», «Lugar de trabajo: Getafe»): the label's first words. Else a caption's words up
// to four, then each shorter run («Ústí nad Labem», «Ústí»).
export function labelledTowns(text: string, agency: boolean): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(agency ? JOB_LINE : ANY_LINE)) {
    const first = ((match[1] ?? "").split(/[,;(|/]|\s[-–]\s/)[0] ?? "")
      .replace(/^\d{4,5}\s+/u, "")
      .trim();
    if (first && !out.includes(first)) out.push(first);
    if (out.length >= 2) break;
  }
  if (out.length) return out;
  for (const match of text.matchAll(CAPTION)) {
    const words = (match[1] ?? "").split(/\s+/);
    for (let count = words.length; count > 0; count--) {
      const run = words.slice(0, count).join(" ");
      if (!/\s(?:nad|pod|na|u|v|ve)$/u.test(run) && !out.includes(run))
        out.push(run);
    }
    if (out.length >= 4) break;
  }
  return out;
}

// A text that places staff with a client («unser Kunde», "our client», «para proyecto en cliente») or names agency work:
// its address is the agency's own office (Personal Sigma's Muotathal for a job anywhere in German-speaking Switzerland,
// 6 November 2026), so it is read as an agency's. The legacy's normalise `FOR_A_CLIENT`, from the word tables.
const CLIENT_WORDS = [
  ...conceptWords("forAClient", { bare: true }),
  ...conceptWords("agencyWork", { bare: true }),
];
export const FOR_A_CLIENT = new RegExp(
  `(?<![\\p{L}])${anyOf(CLIENT_WORDS)}(?![\\p{L}])`,
  "iu",
);

// The town a phrase gives where no line labels one. German: the title's «… in Oppenheim», «… –
// Salem», «Region Mannheim»; the text's «für unseren Standort Wittlich», «Niederlassung in
// Hilgert», «unser Team in Hannover», not a head office's («Hauptsitz in Wiesbaden»). Up to four
// capitalised words, then each shorter run («Bad Oldesloe Vollzeit», «Bad Oldesloe»). Of 44,830
// German-speaking offers with no town, 3,970 placed so, a sample of 45 right (7 November 2026).
// Dutch, French and English the same way («regio Zwolle», «vestiging Eindhoven», «basé à
// Strasbourg», «based in Redhill»), but a name is cut only of a closing word for a site or in
// capitals («London E»): a shorter one is often another place («Buckingham Palace», «Stone
// Cross»). Of 34,076 such offers with no town, 4,087 placed so (7 November 2026).
const PHRASE_NAME = String.raw`(\p{Lu}[\p{L}.]*(?:(?:-|\s(?:(?:am|an|im|in|ob|bei|der|vor der|a\.|v\.\s?d\.|a\.\s?d\.)\s)?)\p{Lu}[\p{L}.]*){0,3})`;
const NAME_START = String.raw`\p{Lu}[\p{L}'’.]*`;
const NAMES = {
  nl: String.raw`(${NAME_START}(?:(?:-|\s(?:(?:aan|op|bij|ten|ter|in)\s(?:de\s|den\s|der\s)?)?)${NAME_START}){0,3})`,
  fr: String.raw`(${NAME_START}(?:(?:-(?:(?:le|la|les|lès|sur|sous|en|de|du|des|aux|et)-)?|-d['’]|\s(?:(?:sur|sous|en|le|la|les|de|du|des|aux)\s)?|\sd['’])${NAME_START}){0,4})`,
  en: String.raw`(${NAME_START}(?:(?:-|\s(?:(?:upon|on|in|under|by|le)\s)?)${NAME_START}){0,3})`,
};

type PhraseLanguage = "de" | "nl" | "fr" | "en";

// For each language, the title's phrases and the text's. Without "i": a town's capital is what
// tells it from the words after it («Wittlich suchen wir»).
const PHRASES: Readonly<
  Record<PhraseLanguage, readonly [title: RegExp, text: RegExp]>
> = {
  de: [
    new RegExp(
      String.raw`(?:(?<![\p{L}])(?:in|bei|nahe|[Rr]aum|[Rr]egion|[Gg]roßraum|[Ss]tandort)\s+|\s[-–|]\s|,\s)${PHRASE_NAME}`,
      "gu",
    ),
    new RegExp(
      String.raw`(?<![\p{L}])(?:[Ss]tandort(?:e|en)?|[Nn]iederlassung|[Ff]iliale|[Ww]erk|[Bb]üro|[Bb]etrieb|[Tt]eams?)\s+(?:(?:in|im|bei|nahe)\s+)?${PHRASE_NAME}`,
      "gu",
    ),
  ],
  nl: [
    new RegExp(
      String.raw`(?:(?<![\p{L}])(?:in|te|regio|omgeving|nabij)\s+|\s[-–|]\s|,\s)${NAMES.nl}`,
      "gu",
    ),
    new RegExp(
      String.raw`(?<![\p{L}])(?:[Vv]estiging|[Kk]antoor|[Ll]ocatie|[Rr]egio)(?:\s+(?:in|te))?\s+${NAMES.nl}`,
      "gu",
    ),
  ],
  fr: [
    new RegExp(
      String.raw`(?:(?<![\p{L}])(?:à|sur)\s+|\s[-–|]\s|,\s)${NAMES.fr}`,
      "gu",
    ),
    new RegExp(
      String.raw`(?<![\p{L}])(?:(?:[Bb]as[ée]e?s?|[Ss]itu[ée]e?s?)\s+(?:à|sur)|(?:[Ss]ite|[Aa]gence|[Uu]sine|[Éé]tablissement)\s+(?:de\s+|d['’]))\s*${NAMES.fr}`,
      "gu",
    ),
  ],
  // A bracket only round the name alone («(Blyth)»), not round a field («(Bridge & Structures)»).
  en: [
    new RegExp(
      String.raw`(?:(?<![\p{L}])(?:in|near)\s+|\s[-–|]\s|,\s)${NAMES.en}|\(${NAMES.en}(?=\))`,
      "gu",
    ),
    new RegExp(
      String.raw`(?<![\p{L}])(?:(?:[Bb]ased|[Ll]ocated)\s+(?:in|at|near)|(?:[Oo]ffice|[Ss]ite|[Pp]lant|[Dd]epot|[Ff]acility)\s+in)\s+${NAMES.en}`,
      "gu",
    ),
  ],
};

// The languages whose phrases are read in each country.
const PHRASE_LANGUAGES: Readonly<Record<string, readonly PhraseLanguage[]>> = {
  de: ["de"],
  at: ["de"],
  ch: ["de"],
  nl: ["nl", "en"],
  be: ["nl", "fr", "en"],
  fr: ["fr", "en"],
  lu: ["fr", "en"],
  gb: ["en"],
  ie: ["en"],
  mt: ["en"],
};

const CLOSING =
  /^(?:type|office|site|area|campus|station|centre|center|region|regio|hq|head|hybrid|remote|kantoor|vestiging|bureau|bureaux|agence|siège)$/i;

// The towns the title's and the text's phrases give, in the languages of the advert's country.
// An agency's text is never read: its branch. Its title is.
export function phraseTowns(
  title: string,
  text: string,
  agency: boolean,
  country: string,
): string[] {
  const out: string[] = [];
  const put = (town: string) => {
    if (town && !out.includes(town)) out.push(town);
  };
  const add = (language: PhraseLanguage, said: string) => {
    // Not a letter or two: a gender's «(E)» or «H/F» («Technico-Commercial(E)» was Ay).
    if (said.replace(/[^\p{L}]/gu, "").length < 3) return;
    const words = said.split(/\s+/);
    if (language === "de") {
      for (let count = words.length; count >= 1; count--)
        put(words.slice(0, count).join(" "));
      return;
    }
    put(said);
    let last = words.at(-1) ?? "";
    while (
      words.length > 1 &&
      (CLOSING.test(last) || last === last.toUpperCase())
    ) {
      words.pop();
      put(words.join(" "));
      last = words.at(-1) ?? "";
    }
  };
  const languages = PHRASE_LANGUAGES[country] ?? [];
  for (const language of languages)
    for (const match of title.matchAll(PHRASES[language][0]))
      add(language, match[1] ?? match[2] ?? "");
  if (!agency)
    for (const language of languages)
      for (const match of text.matchAll(PHRASES[language][1])) {
        add(language, match[1] ?? "");
        if (out.length >= 12) break;
      }
  return out;
}
