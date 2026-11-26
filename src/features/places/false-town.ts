// The legacy's builder/normalise.ts `withoutFalseTown` and what it reads (JustJans/indudex@ec79858), copied (legacy
// resync T012): a town an advert's place names that is no town (its country's own name, a form's word, a region larger
// than a country, a work mode, an address, a firm, a page's sentence, a list of countries), or that is another
// European country's name, which is then the advert's country. Only its imports changed: what the map knows comes
// from our gazetteer (`Everywhere`, built by place-advert.ts), and `Compiled` is our countries' codes. Its own comments
// keep their marks.
import { fold } from "../../shared/kit/fold.js";
import { postalTowns } from "./text-towns.js";

export type PlaceRead = { cc: string; city: string };
type Places = Record<string, string[]>;
export type Compiled = { iso: string };
// What the map knows: a town or an area of a country by a name, and the country of our own a town's name is in.
export type Everywhere = {
  knows: (cc: string, city: string) => boolean;
  countryOf: (city: string, allowed: Set<string>) => { cc: string } | null;
};
const knownTown = (
  cc: string,
  city: string,
  _compiled: Compiled[],
  everywhere: Everywhere | null,
) => Boolean(everywhere?.knows(cc, city));
const countryOfTown = (
  city: string,
  everywhere: Everywhere,
  allowed: Set<string>,
) => everywhere.countryOf(city, allowed);
// ➤ A list's part, or a town, that names no place ("Other, GB", "Any location", «Various»).
const NO_PLACE = /^(?:other|others|any|various|all)(?![a-z])/;
const LEGAL_FORM =
  /(?:^|[^\p{L}])(?:gmbh|ag|kg|ohg|se|ug|e\.?\s?v|ltd|limited|plc|b\.?v|n\.?v|s\.?a|s\.?l|srl|sas|sarl|s\.?p\.?a|ab|a\/s|oy|inc|llc|mbh|s\.\s?r\.\s?o|a\.\s?s)(?![\p{L}])/iu;

// ➤ A town that is its country's own name in some language («Deutschland», «Polska», «España») or a word of a form
// ➤ («Lokalita», "Location for Hiring", «bundesweit», "-") names no town: the card shows the country alone, not
// ➤ «Deutschland, Alemania». Of the 77,343 published towns not on the map, about 11,000 were such (1 November 2026). A
// ➤ town on the map keeps its name: Luxembourg is a town too.
const NAME_LOCALES = [
  "en",
  "es",
  "ca",
  "eu",
  "gl",
  "fr",
  "de",
  "nl",
  "it",
  "pt",
  "pl",
  "cs",
  "sk",
  "sl",
  "hr",
  "bs",
  "sr",
  "sr-Latn",
  "mk",
  "sq",
  "hu",
  "ro",
  "bg",
  "el",
  "sv",
  "nb",
  "nn",
  "da",
  "fo",
  "is",
  "fi",
  "et",
  "lv",
  "lt",
  "mt",
  "ga",
  "cy",
  "lb",
  "tr",
  "uk",
];
const NAME_LISTS = NAME_LOCALES.map(
  (l) => new Intl.DisplayNames([l], { type: "region" }),
);
const OWN_NAMES = new Map<string, Set<string>>();
const plain = (s: string) =>
  fold(s)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
// ➤ Names a country still goes by that the languages' lists no longer give ("Czech Republic", "Holland").
const OLD_NAMES: Places = {
  cz: [
    "czech republic",
    "republique tcheque",
    "tschechische republik",
    "republica checa",
  ],
  nl: ["holland", "the netherlands"],
  gb: ["great britain", "uk"],
  sk: ["slovak republic"],
  ie: ["republic of ireland", "eire"],
};
const ownNames = (cc: string): Set<string> => {
  let own = OWN_NAMES.get(cc);
  if (!own) {
    let names: string[] = [];
    try {
      names = NAME_LISTS.map((d) => plain(d.of(cc.toUpperCase()) ?? ""));
    } catch {
      // ➤ A code the runtime does not know has no own names.
    }
    own = new Set([...names, ...(OLD_NAMES[cc] || [])]);
    OWN_NAMES.set(cc, own);
  }
  return own;
};
const NO_TOWN = new Set([
  "",
  "lokalita",
  "location for hiring",
  "bundesweit",
  "deutschlandweit",
  "mehrere standorte",
  "verschiedene standorte",
  "diverse standorte",
  "m f d",
  "m w d",
  "w m d",
  "f m d",
  "location",
  "standort",
  "various locations",
  "multiple locations",
  "several locations",
  "plusieurs sites",
  "divers sites",
  "varias ubicaciones",
  "unknown",
  "europe",
  "home",
  "remote",
  "not specified",
  "elsewhere",
  "bewerben in",
  "szukaj pracy wedlug lokalizacji",
  "szukaj pracy według lokalizacji",
  // ➤ A page's buttons and filters read as the place («All», «Alle», «Previous»: 29 published offers, 7 November 2026).
  "all",
  "alle",
  "previous",
  "next",
  "menu",
  "close",
  "innenstadt",
  // ➤ A page's links, a slogan and a typo shown as the town («Contactez-nous», «Archives», «Sterk in lokaal vakmanschap»,
  // ➤ «unkown», «Headquarters», «Cap»: 160 published offers, 8 November 2026).
  "contactez nous",
  "archives",
  "archive",
  "sterk in lokaal vakmanschap",
  "unkown",
  "unknown",
  "headquarters",
  "cap",
]);
// ➤ A form's field or a placeholder read as the place («Standort auswählen *», «Plaats», «ANY CITY», «o Población», «In
// ➤ person», «Nationwide», «Field Based», «m / w / nb»: about 900 published offers, 7 November 2026). A town the map
// ➤ knows of that name still wins (withoutFalseTown).
const PLACEHOLDER =
  /^(?:(?:erforderlich )?standort (?:auswahlen|wahlen)(?: .*)?|plaats|ort|o poblacion|poblacion|any cit(?:y|ies)|all cities|in person|vor ort|nationwide|(?:uk )?field based|home worker|work at home|anywhere(?: in [a-z ]+)?|flexible|other|overal|(?:alle |unsere )?standorte|standortes|standortunabhangig|vacancy city|[mfw] [mfw] (?:nb|x)|uk wide or selected office|job in multiple offices uk wide|heel nederland|landelijk|omscholer|anhange|ausbildungsort)$/;
// ➤ A region larger than a country is no town («Western Europe», «EMEA», «LATAM», «DACH», «Nordics»): the card shows the
// ➤ country the rest of the advert gives.
const MACRO_REGION =
  /^(?:(?:western|eastern|central|northern|southern|south eastern|north western|continental) europe|emea|apac|latam|amer|americas|dach|benelux|nordics?|cee|mena|gcc|worldwide|global)$/;
const namesNoTown = (cc: string, city: string) =>
  /^(?:xx|zz)$/.test(cc)
    ? false
    : NO_TOWN.has(plain(city)) ||
      PLACEHOLDER.test(plain(city)) ||
      MACRO_REGION.test(plain(city)) ||
      NO_PLACE.test(plain(city)) ||
      ownNames(cc).has(plain(city));
// ➤ A town that is another European country's name is that country: a Polish board's posts abroad keep Poland and name
// ➤ «Niemcy» or «Holandia» as their town (infopraca, 364 published offers on 1 November 2026). Only from a country of ours:
// ➤ "Holland, Michigan" stays in the United States.
let COUNTRY_BY_NAME: Map<string, string> | null = null;
const countryNamed = (city: string, compiledCountries: Compiled[]) => {
  COUNTRY_BY_NAME ||= new Map(
    compiledCountries
      .filter((c) => !/^(?:xx|zz)$/.test(c.iso))
      .flatMap((c) =>
        [...ownNames(c.iso)].map((n): [string, string] => [n, c.iso]),
      ),
  );
  return COUNTRY_BY_NAME.get(plain(city)) || "";
};
// ➤ A work mode written into the town says how, not where («Germany (Remote)», «Kassel Hybrid», «Romsey Onsite 5 days
// ➤ per week»), as schema.org keeps a job's `jobLocationType` apart from its `jobLocation`. What is left stays the town
// ➤ only where the map knows it: such rests are as often a list, a condition or a country ("the UK / Dublin", "Must be
// ➤ UK based"), and the card then shows the country alone. 1,604 published offers had such a town on 2 November 2026.
// ➤ A bracket that holds the mode goes whole («Essex (Hybrid Working Available)»), and so does what follows a "with"
// ➤ («Watford with hybrid home working») and a board's count of more places («+58»).
const MODE =
  "(?:fully\\s+|100\\s*%\\s*|partly\\s+|partially\\s+)?(?:remote|hybrid|on-?site|home\\s*(?:office|working|based)|telework(?:ing)?|hybride|remoto|h[ií]brido|teletrabajo|t[ée]l[ée]travail|mobiles?\\s+arbeiten|thuiswerken)(?:\\s+(?:working|work|first))?";
const MODE_WORD = new RegExp(
  `\\b${MODE}\\b|\\b\\d\\s*days?\\s+(?:per|a)\\s+week\\b`,
  "gi",
);
const MODE_BRACKET = new RegExp(`\\([^()]*\\b${MODE}\\b[^()]*\\)`, "gi");
const withoutMode = (city: string) =>
  city
    .replace(MODE_BRACKET, " ")
    .replace(MODE_WORD, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+(?:with|mit|con|avec)\s.*$/i, "")
    .replace(/\s*\+\d+\s*$/, "")
    .replace(/^[\s\-–—,;|/:.]+|[\s\-–—,;|/:]+$/g, "")
    .replace(
      /^(?:in|en|im|à)\s+|\s+(?:and|und|y|et|or|oder|o|ou|in|en|im)$/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\((.*)\)$/, "$1")
    .trim();
// ➤ A town the map does not know that holds a figure or a company's legal form is an address, a count or a firm read as
// ➤ the place («Europastraße 67 4600 Wels», «Paderborn bis zu 18», «339», «PI Ceramic GmbH», «Landshut bei Meiko
// ➤ Deutschland GmbH»: about 3,500 published offers, 7 November 2026). The card takes the town after its postcode, else
// ➤ what comes before the figure or the clause, where the map knows it; else no town, and it shows the country. The
// ➤ legal forms are the company names' (LEGAL_FORM, below).
// ➤ Tried in turn: the town after the postcode («4600 Wels»); the town in a site's code («FR-IDF-ANTONY-004»,
// ➤ «GB.Derby.4 Roundhouse Road»); what comes before the figure or the clause («Paderborn bis zu 18»), also without a
// ➤ word for a site («Grobbendonk Industrieweg», «TARBES CEDEX») or a Swiss canton («Stein AG»), and its first words, two
// ➤ at least («Hradec Králové O nás Od roku»); the town after a Danish street's number («Bækgårdsvej 39 Skjern») or a
// ➤ department's («87 - Haute-Vienne»), or after a firm's «in» («Singulus Technologies AG in Kahl am Main»). If the map knows none, what came before a bracket stays when it is a clean name
// ➤ («Haute Garonne (31)», «Lupfig (AG)»): not a street, not a firm.
const FILLER =
  /(?:\s+(?:cedex|office|site|depot|zone|industrieweg|gewerbegebiet|industriegebiet|zi|za|abteilung|department|departamento|campus|plant|werk|hq))+$/iu;
const STREET =
  /(?:straße|strasse|str\.|gasse|weg|vej|laan|straat|plein|ring|allee|platz|rue|road|street|avenue|via|strada|ulica|ul\.)(?![\p{L}])/iu;
// ➤ A firm's legal form, not a spa town's («Droitwich Spa»), a British postcode's letters («SL0 0ED») or a canton («(AG)»).
const firmLike = (city: string) =>
  LEGAL_FORM.test(
    city
      .replace(/(?<![\p{L}])spa(?![\p{L}])/giu, "")
      .replace(/(?<![\p{L}\d])\p{Lu}{1,2}\d[\p{Lu}\d]*/gu, "")
      .replace(/\s*\(?\p{Lu}{2}\)?$/u, ""),
  );
const addressTown = (
  place: PlaceRead,
  compiledCountries: Compiled[],
  everywhere: Everywhere | null,
) => {
  const before = (
    place.city.split(/\s+(?:bis zu|bei|ab)\s|\s*[(+~]|\s*\d/u)[0] ?? ""
  )
    .replace(/[\s,;:–-]+$/u, "")
    .trim();
  const words = before.split(/\s+/);
  const code =
    (place.city.match(/^[A-Z]{2}\.([^.~\d]+)\./u) ||
      place.city.match(/^[A-Z]{2}-(?:[A-Z]{2,4}-)?([^-~\d]+?)-/u) ||
      [])[1] || "";
  const tries = [
    ...postalTowns(place.city, place.cc),
    code,
    before,
    before.replace(FILLER, ""),
    before.split(/\s[-–]\s/)[0],
    before.replace(/[\s,]+[A-Z]{2}$/u, ""),
    ...words
      .slice(2)
      .map((_, i) => words.slice(0, words.length - 1 - i).join(" ")),
    (place.city.match(/\d+\p{L}?\s+(\p{Lu}[\p{L}-]+)$/u) || [])[1],
    (place.city.match(/\sin\s+(\p{Lu}.+)$/u) || [])[1],
    place.city.replace(/^\d+\s*[-–]\s*/u, ""),
  ];
  const found = tries.find(
    (t) => t && knownTown(place.cc, t, compiledCountries, everywhere),
  );
  if (found) return found;
  return /^[^(]+\(/.test(place.city) &&
    /^\p{L}[\p{L}' -]{2,}$/u.test(before) &&
    !firmLike(place.city) &&
    !STREET.test(before)
    ? before
    : "";
};
const SENTENCE_WORD =
  /(?<![\p{L}])(?:we|you|our|your|us|is|are|will|should|can|this|wir|dich|dir|sie|ihr\p{L}*|unser\p{L}*|euch|ist|sind|bist|wirst|werden|haben|hast|nous|vous|votre|vos|notre|nos|sont|tu|wij|jij|uw|ons|onze|zijn|bent|możliwość|jesteśmy|nasz\p{L}*|nuestr\p{L}*|nostr\p{L}*|noi|siamo)(?![\p{L}])/iu;
// ➤ A town the map does not know, of three words or more, with a lowercase word of five letters or more is a page's
// ➤ sentence («Search for jobs by location», «Barcelona y alrededores»): its first words where the map knows them, else
// ➤ no town. Names have such words only as particles («Spezzano della Sila», «Newcastle under Lyme», «Sant Joan
// ➤ d'Alacant»): 11 of the map's 7,846 names of three words or more in our countries have another, most of them districts.
const PARTICLE =
  /^(?:della|delle|dello|degli|sulla|sullo|nella|nelle|negli|under|unter|sobre)$/iu;
const proseWord = (word: string) =>
  /^\p{Ll}[\p{L}.'’-]{4,}$/u.test(word) &&
  !/^\p{L}{1,5}['’]/u.test(word) &&
  !PARTICLE.test(word);
const townInProse = (
  place: PlaceRead,
  compiledCountries: Compiled[],
  everywhere: Everywhere | null,
) => {
  const words = place.city.trim().split(/\s+/);
  if (words.length < 3 || !words.slice(1).some(proseWord)) return place.city;
  const lead = words
    .slice(1)
    .map((_, i) => words.slice(0, words.length - 1 - i).join(" "));
  return (
    lead.find((t) => knownTown(place.cc, t, compiledCountries, everywhere)) ||
    ""
  );
};
// ➤ A list of countries, or of a country and a word for no place, names no town («Germany / Portugal / France / Spain +2»,
// ➤ «Portugal - Nationwide»).
const namesCountriesOnly = (
  place: PlaceRead,
  compiledCountries: Compiled[],
) => {
  const parts = place.city
    .replace(/\s*\+\d+\s*$/, "")
    .split(/\s+[-–—]\s+|\s*[/|,;]\s*/);
  return (
    parts.length > 1 &&
    parts.every(
      (p) => namesNoTown(place.cc, p) || countryNamed(p, compiledCountries),
    )
  );
};
export const withoutFalseTown = (
  found: PlaceRead,
  compiledCountries: Compiled[],
  everywhere: Everywhere | null = null,
): PlaceRead => {
  // ➤ A postcode written before the town is no part of its name («86568 Igenhausen», «27804 Berne»: 216 published offers,
  // ➤ 7 November 2026).
  let place = /^\d{4,5}\s+\p{L}/u.test(found.city || "")
    ? { ...found, city: found.city.replace(/^\d{4,5}\s+/u, "") }
    : found;
  // ➤ A label before the town («Ogłoszenie w: Rzeszów», a Polish board's «Advert in:»: about 700 published offers, 7 November
  // ➤ 2026): the town after it, where the map knows it.
  const labelled = String(place.city || "").match(
    /^[^:]{2,30}:\s*(\p{Lu}.*)$/u,
  );
  if (
    labelled?.[1] &&
    knownTown(place.cc, labelled[1], compiledCountries, everywhere)
  )
    place = { ...place, city: labelled[1] };
  if (place.city?.match(MODE_WORD)) {
    const left = withoutMode(place.city);
    place = {
      ...place,
      city:
        left && knownTown(place.cc, left, compiledCountries, everywhere)
          ? left
          : "",
    };
  }
  if (!place.city || /^(?:xx|zz)$/.test(place.cc)) return place;
  const ours = compiledCountries.some((c) => c.iso === place.cc);
  const none =
      namesNoTown(place.cc, place.city) ||
      namesCountriesOnly(place, compiledCountries),
    other = none || !ours ? "" : countryNamed(place.city, compiledCountries);
  const known = knownTown(place.cc, place.city, compiledCountries, everywhere);
  // ➤ Not a list of places, nor the count of more places a list or a board puts after them («Romania +3», «… +1»).
  const odd =
    !/\s\/\s/.test(place.city) &&
    (/\d/.test(place.city.replace(/\s*\+\d+$/, "")) || firmLike(place.city));
  if (!known && !none && odd)
    return {
      ...place,
      city: addressTown(place, compiledCountries, everywhere),
    };
  if (!known && !none) {
    const bare = place.city.replace(FILLER, "");
    if (
      bare !== place.city &&
      knownTown(place.cc, bare, compiledCountries, everywhere)
    )
      return { ...place, city: bare };
    const prose = townInProse(place, compiledCountries, everywhere);
    if (prose !== place.city) return { ...place, city: prose };
  }
  // ➤ Six words or more the map does not know, with a word only sentences have, are a sentence of the page read as the
  // ➤ place («Im zweiten Gespräch laden wir dich an de», «We have a high-quality infrastructure wi»): no town. Not a long
  // ➤ town or region name, which has articles and prepositions but none of those («Runkel bei Limburg an der Lahn»).
  if (
    !known &&
    !none &&
    !/\s\/\s|,/.test(place.city) &&
    place.city.trim().split(/\s+/).length >= 6 &&
    SENTENCE_WORD.test(place.city)
  )
    return { ...place, city: "" };
  // ➤ Andorra stated for a town it does not have is a form's first country, and the town's own is clearly another of ours
  // ➤ (countryOfTown): a site's data wrote «addressCountry: AD» for Wien (Raiffeisen Software, the owner's photo, 7 November
  // ➤ 2026). Only Andorra, whose towns the map holds all: for any country, 2,834 published offers would move, most wrongly
  // ➤ (Le Havre written «Havre» to Belgium, «92318 Neumarkt» to Romania), since the map lacks many small towns and names.
  if (place.cc === "ad" && everywhere && !none && !other && !known) {
    const there = countryOfTown(
      place.city,
      everywhere,
      new Set(compiledCountries.map((c) => c.iso)),
    );
    if (there && there.cc !== place.cc)
      return { cc: there.cc, city: place.city };
  }
  if ((!none && (!other || other === place.cc)) || known) return place;
  return none ? { ...place, city: "" } : { cc: other, city: "" };
};
