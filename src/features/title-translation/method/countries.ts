// ➤ The countries the offers name, once: their code and their names in the site's and the sources' languages; the
// ➤ English name first. COUNTRY, COUNTRY_CODE, ENGLISH_PLACE and FIRM_COUNTRY are built from it.
// The legacy's builder/mt/countries.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
const COUNTRIES: [string, ...string[]][] = [
  ["ES", "Spain", "España", "Espanya", "Espagne", "Spanien", "Spanje"],
  ["FR", "France", "Francia", "França", "Frankreich", "Frankrijk"],
  [
    "DE",
    "Germany",
    "Deutschland",
    "Alemania",
    "Alemanya",
    "Allemagne",
    "Duitsland",
  ],
  [
    "NL",
    "Netherlands",
    "Nederland",
    "Holland",
    "Países Bajos",
    "Països Baixos",
    "Pays-Bas",
    "Niederlande",
  ],
  ["BE", "Belgium", "Belgique", "België", "Bélgica", "Bèlgica", "Belgien"],
  [
    "CH",
    "Switzerland",
    "Schweiz",
    "Suisse",
    "Svizzera",
    "Suiza",
    "Suïssa",
    "Zwitserland",
  ],
  ["AT", "Austria", "Österreich", "Àustria", "Autriche", "Oostenrijk"],
  ["IT", "Italy", "Italia", "Itàlia", "Italie", "Italien", "Italië"],
  ["PT", "Portugal"],
  ["LU", "Luxembourg", "Luxemburgo", "Luxemburg"],
  ["AD", "Andorra", "Andorre"],
  ["IE", "Ireland", "Irlanda", "Irlande", "Irland", "Ierland"],
  [
    "UK",
    "United Kingdom",
    "UK",
    "Reino Unido",
    "Regne Unit",
    "Royaume-Uni",
    "Vereinigtes Königreich",
    "Verenigd Koninkrijk",
  ],
  ["PL", "Poland", "Polska", "Polonia", "Polònia", "Pologne", "Polen"],
  [
    "SE",
    "Sweden",
    "Sverige",
    "Suecia",
    "Suècia",
    "Suède",
    "Schweden",
    "Zweden",
  ],
  [
    "DK",
    "Denmark",
    "Danmark",
    "Dinamarca",
    "Danemark",
    "Dänemark",
    "Denemarken",
  ],
  ["NO", "Norway", "Norge", "Noruega", "Norvège", "Norwegen", "Noorwegen"],
  ["FI", "Finland", "Suomi", "Finlandia", "Finlàndia", "Finlande", "Finnland"],
  [
    "CZ",
    "Czechia",
    "Czech Republic",
    "Česko",
    "Chequia",
    "Txèquia",
    "Tchéquie",
    "Tschechien",
    "Tsjechië",
  ],
  [
    "HU",
    "Hungary",
    "Magyarország",
    "Hungría",
    "Hongria",
    "Hongrie",
    "Ungarn",
    "Hongarije",
  ],
  [
    "RO",
    "Romania",
    "România",
    "Rumanía",
    "Romania",
    "Roumanie",
    "Rumänien",
    "Roemenië",
  ],
  ["GR", "Greece", "Grecia", "Grècia", "Grèce", "Griechenland", "Griekenland"],
  [
    "HR",
    "Croatia",
    "Hrvatska",
    "Croacia",
    "Croàcia",
    "Croatie",
    "Kroatien",
    "Kroatië",
  ],
  [
    "SK",
    "Slovakia",
    "Slovensko",
    "Eslovaquia",
    "Eslovàquia",
    "Slovaquie",
    "Slowakei",
    "Slowakije",
  ],
  [
    "SI",
    "Slovenia",
    "Slovenija",
    "Eslovenia",
    "Eslovènia",
    "Slovénie",
    "Slowenien",
    "Slovenië",
  ],
  ["BG", "Bulgaria", "Bulgària", "Bulgarie", "Bulgarien", "Bulgarije"],
  ["US", "USA"],
  ["CA", "Canada", "Canadá", "Kanada"],
];
// ➤ Not a country, but named as one ("Europe" as the offer's town, «Iberia» or «Benelux» after a company).
const REGIONS = ["Europe", "Europa", "Iberia", "Benelux"];
const ANY_NAME = [
  ...new Set([...COUNTRIES.flatMap(([, ...names]) => names), ...REGIONS]),
].sort((a, b) => b.length - a.length);
const ALTERNATION = (names: string[]): string =>
  names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

// ➤ A country given as the offer's town ("España") is translated like any word, not kept as a name.
export const COUNTRY = new RegExp(`^(?:${ALTERNATION(ANY_NAME)})$`, "iu");
// ➤ Countries as English writes them, kept into English (before).
export const ENGLISH_COUNTRIES = [...COUNTRIES.map(([, en]) => en), "UK"];
// ➤ A country's code after a comma, bracket, bar or dash and before the end or another of them (before). Not the
// ➤ codes that are more often a field or a name: IT, Catalan CA, Active Directory AD, human resources HR, Spanish SI
// ➤ (sistemas de información).
const OTHER_WORD = ["IT", "CA", "AD", "HR", "SI"];
export const COUNTRY_CODE = new RegExp(
  `(?<=(?:^|[,(|/–-])\\s*)(?:${COUNTRIES.map(([code]) => code)
    .filter((c) => !OTHER_WORD.includes(c))
    .join("|")})(?=\\s*(?:$|[),|/–-]))`,
  "gu",
);
// ➤ A company named with its country at the start of a title: the name, then the country, before a separator (before).
export const FIRM_COUNTRY = new RegExp(
  `^((\\p{Lu}[\\p{L}\\d&.'’-]*(?:\\s+\\p{Lu}[\\p{L}\\d&.'’-]*){0,2})\\s+(?:${ALTERNATION(ANY_NAME)}))(?=\\s+[-–|:])`,
  "u",
);
