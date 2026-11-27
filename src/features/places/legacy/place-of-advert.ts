// The legacy's place reader, builder/normalise.ts `placeOfAdvert` and what it reads (JustJans/indudex@ec79858), copied
// (career sites T008): an advert's country and town read off its place, its title and its address, the world over
// (the tables of far countries, the US's states and Canada's provinces), for the sources that do not state their
// country: the employers' sites and the boards, read the world over. Only its imports changed: `withoutFalseTown` is
// places' copy (false-town.ts), the towns' readers (`countryOfTown`, `countryOfArea`) are legacy/towns.ts, `Everywhere`
// is our gazetteer as both read it (place-advert.ts builds it), and `workModeOf` is the mode a source states. The
// e-mail, contact and address helpers between its parts are left out. Its own comments keep their marks.
import { fold } from "../../../shared/kit/fold.js";
import { SITE_LANGUAGES as LANGUAGES } from "../../../shared/catalogues/schemas.js";
import { withoutFalseTown } from "../false-town.js";
import {
  countryOfArea,
  countryOfTown,
  withArticle,
  type Everywhere,
} from "./towns.js";

export type { Everywhere };
// ➤ An advert as a reader gives it, as far as its place is read.
export type RawOffer = {
  title?: string;
  url: string;
  company?: string;
  location?: string;
  city?: string;
  country?: string;
  lang?: string;
  mode?: string;
};
// The legacy read the work mode off the advert (builder/work-mode.ts); here, the one its source states: on site «o»,
// hybrid «h».
const workModeOf = (raw: RawOffer): string =>
  raw.mode === "onsite" ? "o" : raw.mode === "hybrid" ? "h" : "";

// ➤ A country of the catalogue (catalogues/countries.json), and as compileCountries reads it.
export interface Country {
  iso: string;
  name: string;
  aliases?: string[];
  cities?: string[];
}
export type Compiled = ReturnType<typeof compileCountries>[number];
type Places = Record<string, string[]>;

// ➤ Countries outside Europe that company boards name most, so their adverts are told apart
// ➤ from adverts whose country is merely unstated. A two-letter code ending the location
// ➤ that is not a European country counts too ("Sherbrooke, QC, CA").
// ➤ The biggest cities outside Europe that boards name without their country.
const FAR_CITIES: Places = {
  us: [
    "new york",
    "nyc",
    "san francisco",
    "los angeles",
    "seattle",
    "austin",
    "boston",
    "chicago",
    "denver",
    "atlanta",
    "dallas",
    "houston",
    "miami",
    "washington dc",
    "washington, dc",
    "san diego",
    "san jose",
    "palo alto",
    "mountain view",
    "sunnyvale",
    "menlo park",
    "redwood city",
    "santa clara",
    "santa barbara",
    "portland",
    "phoenix",
    "philadelphia",
    "pittsburgh",
    "minneapolis",
    "detroit",
    "raleigh",
    "salt lake city",
    "las vegas",
    "silicon valley",
    "bay area",
  ],
  ca: [
    "toronto",
    "vancouver",
    "montreal",
    "montréal",
    "ottawa",
    "calgary",
    "waterloo",
  ],
  au: ["sydney", "melbourne", "brisbane", "perth", "canberra"],
  in: [
    "bangalore",
    "bengaluru",
    "mumbai",
    "hyderabad",
    "pune",
    "chennai",
    "delhi",
    "new delhi",
    "gurgaon",
    "gurugram",
    "noida",
  ],
  sg: ["singapore"],
  jp: ["tokyo", "osaka"],
  kr: ["seoul"],
  cn: ["shanghai", "beijing", "shenzhen", "hangzhou"],
  hk: ["hong kong"],
  tw: ["taipei"],
  br: ["sao paulo", "são paulo", "rio de janeiro"],
  mx: ["mexico city", "guadalajara", "monterrey", "queretaro", "querétaro"],
  ar: ["buenos aires"],
  co: ["bogota", "bogotá"],
  cl: ["santiago"],
  ae: ["dubai", "abu dhabi"],
  il: ["tel aviv"],
  za: ["cape town", "johannesburg"],
  ke: ["nairobi"],
  ng: ["lagos"],
  eg: ["cairo"],
  nz: ["auckland"],
  ph: ["manila"],
  id: ["jakarta"],
  my: ["kuala lumpur"],
  th: ["bangkok"],
  vn: ["ho chi minh", "hanoi"],
  bd: ["dhaka"],
  qa: ["doha"],
  ma: ["casablanca", "rabat", "tangier", "marrakech"],
  tn: ["tunis"],
  dz: ["algiers"],
  kh: ["phnom penh"],
  az: ["baku"],
  uy: ["montevideo"],
  do: ["santo domingo"],
  om: ["muscat"],
  by: ["minsk"],
  ru: ["moscow", "saint petersburg"],
  lk: ["colombo"],
  pk: ["karachi", "lahore", "islamabad"],
};
const FAR: Places = {
  us: [
    "united states",
    "usa",
    "u s a",
    "etats-unis",
    "stati uniti",
    "estados unidos",
    "vereinigte staaten",
    "verenigde staten",
    "forenta staterna",
  ],
  ca: ["canada"],
  au: ["australia"],
  nz: ["new zealand"],
  cn: ["china"],
  in: ["india"],
  jp: ["japan"],
  kr: ["korea", "south korea"],
  sg: ["singapore"],
  tw: ["taiwan"],
  th: ["thailand"],
  my: ["malaysia"],
  id: ["indonesia"],
  vn: ["vietnam"],
  ph: ["philippines"],
  br: ["brazil", "brasil"],
  mx: ["mexico"],
  ar: ["argentina"],
  cl: ["chile"],
  co: ["colombia"],
  pe: ["peru"],
  za: ["south africa"],
  eg: ["egypt"],
  ma: ["morocco"],
  ng: ["nigeria"],
  ke: ["kenya"],
  ae: ["united arab emirates", "uae", "dubai"],
  sa: ["saudi arabia"],
  qa: ["qatar"],
  il: ["israel"],
  kz: ["kazakhstan"],
  pk: ["pakistan"],
};

// ➤ Country and city from a free-text location, against the countries catalogue: an ISO
// ➤ code as its own word, a country name or alias, or a known city. "Remote" is 'xx'.
// ➤ Each country's name in the site's languages too, from Intl: «Espanya», «França», «Duitsland» were not read (NOA-13).
const SITE_NAMES = LANGUAGES.map(
  (l) => new Intl.DisplayNames([l], { type: "region" }),
);
const namesOf = (c: Country): string[] => [
  ...new Set([
    c.name,
    ...(c.aliases || []),
    ...SITE_NAMES.map((n) => n.of(c.iso.toUpperCase())).filter(
      (n): n is string => Boolean(n && n.length > 2),
    ),
  ]),
];
export function compileCountries(countries: Country[]) {
  const word = (s: string) =>
    `(?:^|[^a-z0-9])${fold(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`;
  return countries.map((c) => ({
    iso: c.iso,
    name: c.name,
    names: namesOf(c),
    siteNames: SITE_NAMES.map((n) => n.of(c.iso.toUpperCase())),
    nameRe: new RegExp(namesOf(c).map(word).join("|")),
    nameAll: new RegExp(namesOf(c).map(word).join("|"), "g"),
    cityRe: (c.cities || []).length
      ? new RegExp((c.cities || []).map(word).join("|"))
      : null,
    cityRes: (c.cities || []).map((city): [string, RegExp] => [
      city,
      new RegExp(word(city)),
    ]),
    cities: c.cities || [],
  }));
}

// ➤ Codes that are also a US state or a Canadian province, read the way boards use them:
// ➤ "Baltimore, MD" is Maryland and "Huntsville, AL" Alabama unless a city of Moldova or
// ➤ Albania is named; "Wilmington, DE" is Delaware and "Saskatoon, SK" Saskatchewan, but any
// ➤ other town with DE or SK is in Germany or Slovakia, as their boards write it.
const STATE_CODES: Record<string, string> = {
  md: "us",
  al: "us",
  me: "us",
  mt: "us",
};
const STATE_TOWNS: Places = {
  de: ["wilmington", "newark", "dover"],
  nl: ["st. john's", "st john's", "st. johns", "newfoundland"],
  sk: ["saskatoon", "regina", "saskatchewan"],
};
// ➤ The other states' codes, which no European country shares: with no European country
// ➤ beside them they are the United States, before any town name is read, or "Naples, FL"
// ➤ would be Naples in Italy.
const US_STATES = new Set(
  "ak az ar ca co ct fl ga hi id il in ia ks ky la ma mi mn ms mo ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy dc".split(
    " ",
  ),
);
// ➤ The states by name, for "Dublin, Ohio" and "Merritt Island, Florida": not Georgia (a
// ➤ country too), Washington (a town in Tyne and Wear) or Montana (a province of Bulgaria);
// ➤ New York only opening a place, since at its end it is mostly the city ("London, New York").
const US_STATE_NAMES = [
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "west virginia",
  "wisconsin",
  "wyoming",
  "district of columbia",
].join("|");
const A_STATE = new RegExp(`^(?:${US_STATE_NAMES})$`);
// ➤ SuccessFactors cuts a place to "Farnborough, Engl, Un": the region's first four letters and
// ➤ the country's first two. "Un" is the United Kingdom or the United States, and the region tells
// ➤ which ("Engl", "Scot", "Wale"; "Virg", "Cali", "New"); "West", "Nort", "Sout" and "Kent" are
// ➤ a county or a state ("Keighley, West, Un" is West Yorkshire): the town decides.
const US_CUT = new Set(
  [...US_STATE_NAMES.split("|"), "georgia", "washington", "new york"].map((n) =>
    n.slice(0, 4).trim(),
  ),
);
const EITHER_CUT = new Set(["west", "nort", "sout", "kent"]);
// ➤ The United States named as a country, alone ("…, Ohio, United States").
const US_NAMED =
  /^(?:us|usa|u s a|united states(?: of america)?|etats-unis(?: d'amerique)?|stati uniti(?: d'america)?|estados unidos(?: de america)?|vereinigte staaten(?: von amerika)?)$/;
// ➤ An address that opens with the country and its state ("USA - New York - Malta", "USA
// ➤ Wisconsin Luxemburg", "US-NY-Long Island City") or with the state and a dash ("Ohio -
// ➤ Columbus", "NY - Long Island"). A state's code counts in capitals and before a dash only:
// ➤ "LA ROCHELLE" is not Louisiana, "ID #3gf8b" not Idaho, "US or UK" not Oregon.
const OPENS_US = new RegExp(
  `^(?:(?:us|usa|u\\.s\\.a?\\.?|united states(?: of america)?)[\\s.,:–-]+(?:${US_STATE_NAMES}|new york)(?![a-z])|(?:${US_STATE_NAMES}|new york)\\s+[–-]\\s+)`,
);
const OPENS_US_CODE = new RegExp(
  `^\\s*(?:(?:US|USA|U\\.S\\.A?\\.?|United States)[\\s.,:–-]+)?(?:${[...US_STATES].join("|").toUpperCase()})\\s*[–.-]\\s*\\S`,
);
// ➤ Canada's provinces by code, the ones no European country shares ("London, ON"); NL and SK
// ➤ are read with STATE_TOWNS.
const CA_PROVINCES = new Set([
  "on",
  "qc",
  "bc",
  "ab",
  "mb",
  "ns",
  "nb",
  "pe",
  "yt",
  "nt",
  "nu",
]);
// ➤ Germany's states by name, in German and English: a place that names one is in Germany, and
// ➤ the Swiss town of Baden is not in "Baden-Württemberg".
// ➤ All of one country, in its own language ("deutschlandweit", "bundesweit": all over Germany).
const NATIONWIDE: [string, RegExp][] = [
  ["de", /(?:^|[^a-z])(?:deutschlandweit|bundesweit)/],
  ["at", /(?:^|[^a-z])osterreichweit/],
  ["ch", /(?:^|[^a-z])schweizweit/],
];
const DE_STATES =
  /(?:^|[^a-z0-9-])(?:baden-wurttemberg|baden-wuerttemberg|baden-baden|bayern|bavaria|hessen|hesse|niedersachsen|lower saxony|nordrhein-westfalen|north rhine-westphalia|rheinland-pfalz|rhineland-palatinate|saarland|sachsen|saxony|sachsen-anhalt|saxony-anhalt|schleswig-holstein|mecklenburg-vorpommern|thuringen|thueringen|thuringia)(?![a-z0-9]|-[a-z])/;
// ➤ "Island" is Iceland in German and the Nordic languages and a plain word in English place
// ➤ names ("Long Island City", "Rhode Island"): it names the country only standing on its own
// ➤ ("Reykjavík, Island").
const ONLY_ALONE = new Set(["island"]);
const alone = (f: string, start: number, end: number) =>
  /(?:^|[,;(|/–-])\s*$/.test(f.slice(0, start)) &&
  /^\s*(?:$|[,;)|/–-])/.test(f.slice(end));

// ➤ Where in a text a pattern last ends, or -1.
const lastEnd = (re: RegExp, text: string) => {
  let end = -1;
  for (const m of text.matchAll(re)) end = m.index + m[0].length;
  return end;
};
// ➤ Countries outside Europe read by their names only, never by a code: theirs are Italian provinces' («Rapallo (GE)»,
// ➤ «Palermo (PA)», «Modena (MO)») or US states'. Without them a remote job "within Mauritius" or in "Dhaka, Bangladesh"
// ➤ was published as one for anywhere (the offers' diary, 1 November 2026).
const FAR_BY_NAME: Places = {
  bd: ["bangladesh"],
  mu: ["mauritius"],
  do: ["dominican republic", "republica dominicana"],
  kh: ["cambodia"],
  az: ["azerbaijan"],
  uy: ["uruguay"],
  om: ["oman", "sultanate of oman"],
  by: ["belarus"],
  ru: ["russia", "russian federation"],
  am: ["armenia"],
  lk: ["sri lanka"],
  np: ["nepal"],
  mm: ["myanmar"],
  mn: ["mongolia"],
  uz: ["uzbekistan"],
  kg: ["kyrgyzstan"],
  tj: ["tajikistan"],
  tm: ["turkmenistan"],
  af: ["afghanistan"],
  ir: ["iran"],
  iq: ["iraq"],
  sy: ["syria"],
  jo: ["jordan"],
  lb: ["lebanon"],
  kw: ["kuwait"],
  bh: ["bahrain"],
  ye: ["yemen"],
  dz: ["algeria"],
  tn: ["tunisia"],
  ly: ["libya"],
  sd: ["sudan"],
  et: ["ethiopia"],
  gh: ["ghana"],
  sn: ["senegal"],
  ci: ["ivory coast", "cote d'ivoire"],
  cm: ["cameroon"],
  tz: ["tanzania"],
  ug: ["uganda"],
  rw: ["rwanda"],
  zm: ["zambia"],
  zw: ["zimbabwe"],
  bw: ["botswana"],
  mz: ["mozambique"],
  ao: ["angola"],
  mg: ["madagascar"],
  ec: ["ecuador"],
  bo: ["bolivia"],
  py: ["paraguay"],
  ve: ["venezuela"],
  gt: ["guatemala"],
  hn: ["honduras"],
  sv: ["el salvador"],
  ni: ["nicaragua"],
  cr: ["costa rica"],
  pa: ["panama"],
  cu: ["cuba"],
  jm: ["jamaica"],
  pr: ["puerto rico"],
  tt: ["trinidad and tobago"],
  hk: ["hong kong"],
  mo: ["macau", "macao"],
};
const FAR_NAMES = Object.entries({ ...FAR, ...FAR_BY_NAME }).map(
  ([iso, names]): [string, RegExp] => [
    iso,
    new RegExp(
      names.map((n) => `(?:^|[^a-z0-9])${n}(?![a-z0-9])`).join("|"),
      "g",
    ),
  ],
);
// ➤ Any of some names as a word of a folded text, compiled once.
const anyWord = (names: string[]) =>
  new RegExp(
    names
      .map(
        (n) =>
          `(?:^|[^a-z0-9])${fold(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`,
      )
      .join("|"),
  );
const FAR_CITY_RES = Object.entries(FAR_CITIES).map(
  ([iso, names]): [string, RegExp] => [iso, anyWord(names)],
);
const STATE_TOWN_RES: Record<string, RegExp> = Object.fromEntries(
  Object.entries(STATE_TOWNS).map(([iso, towns]) => [iso, anyWord(towns)]),
);

// ➤ A place without what may trail it and hide its country: a postcode ("…, NY, US, 11101",
// ➤ "Holland MI 49423", "…, CA, C1N 3C4", "Gouda, NL, 2801 SC") or an empty value ("null"); and
// ➤ without the directions of a street ("1910 SE Federal Hwy"), which are not Sweden.
const POSTCODE =
  /^(?:[\d\s-]+|\d{4} ?[A-Z]{2}|[A-Z]\d[A-Z] ?\d[A-Z]\d|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/;
const EMPTY = /^(?:null|undefined|_|-)?$/i;
// ➤ Each trailing code read one way only: «[\w-]*\d[\w-]*» could place its digit anywhere, and ten codes before a word
// ➤ took seconds, each one more five times as long (NOA-04).
// ➤ A Dutch postcode before its town is no code either («Wagnerlaan 55, 6815 AD, Arnhem» is not in Andorra), nor part
// ➤ of the town («2801 SC Gouda»).
const POSTCODE_BEFORE_TOWN = /\b\d{4} ?[A-Z]{2}(?=\s*,?\s*\p{Lu}\p{Ll})/gu;
function withoutTail(place: string) {
  const parts = place
    .replace(/\b(\d+)\s+(?:NE|NW|SE|SW)\s+(?=\w)/g, "$1 ")
    .replace(POSTCODE_BEFORE_TOWN, "")
    .split(",");
  while (
    parts.length > 1 &&
    (EMPTY.test(parts.at(-1)?.trim() ?? "") ||
      POSTCODE.test(parts.at(-1)?.trim() ?? ""))
  )
    parts.pop();
  parts.push(
    (parts.pop() ?? "").replace(/(?:\s+(?=[\w-]*\d)[\w-]+(?![\w-]))+\s*$/, ""),
  );
  return parts.join(",");
}

// ➤ The country a place names, read the way addresses are written, from the town to the country:
// ➤ within one place the country named last is the country, so in "Sydney, New South Wales,
// ➤ Australia" or "North Kingstown, Rhode Island, USA" the European word inside a state's name
// ➤ (Wales, Island) is not one. A US state ending the place ("Dublin, Ohio", "Kent Island, MD")
// ➤ or opening it ("USA - New York - Malta") makes it American. A list of places ("Berlin,
// ➤ Germany; Austin, USA") keeps the first that is in Europe. Answers { cc, european } or null
// ➤ when no country is named.
// ➤ What a text names, remembered for the build: 85 % of the adverts' places repeat one already read, and reading
// ➤ which country a place names was 12 % of a publication's processor (docs/research/incremental-publication.md).
// ➤ A memory for each kind of reading and each list of countries, of REMEMBER texts at most: past that it starts
// ➤ again, so it stays small, and a title read once does not push out a place read every day.
const REMEMBER = 100_000;
const remembered = new WeakMap<
  Compiled[],
  Record<string, Map<string, unknown>>
>();
function remember<T>(
  compiled: Compiled[],
  kind: string,
  text: string,
  read: () => T,
): T {
  const kinds = remembered.get(compiled) ?? {};
  remembered.set(compiled, kinds);
  const known = (kinds[kind] ||= new Map());
  if (known.has(text)) return known.get(text) as T;
  if (known.size >= REMEMBER) known.clear();
  const value = read();
  known.set(text, value);
  return value;
}
const namedCountry = (raw: string, compiled: Compiled[]) =>
  remember(compiled, "country", raw, () => readNamedCountry(raw, compiled));

function readNamedCountry(
  raw: string,
  compiled: Compiled[],
): { cc: string; european?: Compiled } | null {
  let far: string | null = null;
  for (const segment of raw.split(/[;|]|\s\/\s/)) {
    const place = withoutTail(segment);
    const f = fold(place);
    let euro: Compiled | null = null,
      euroEnd = -1,
      farIso: string | null = null,
      farEnd = -1;
    for (const c of compiled) {
      for (const m of f.matchAll(c.nameAll)) {
        const end = m.index + m[0].length,
          name = m[0].replace(/^[^a-z0-9]/, "");
        if (
          end > euroEnd &&
          (!ONLY_ALONE.has(name) || alone(f, end - name.length, end))
        ) {
          euro = c;
          euroEnd = end;
        }
      }
    }
    for (const [iso, re] of FAR_NAMES) {
      const end = lastEnd(re, f);
      if (end > farEnd) {
        farIso = iso;
        farEnd = end;
      }
    }
    // ➤ A code outside Europe ending the place ("…, New South Wales, AU") names its country; a US
    // ➤ state's ("Wallops Island, VA"), or one European countries share when that country is not
    // ➤ the one named ("Kent Island, MD"), only outranks the European word, and is read as the
    // ➤ US further on, after the European codes.
    const endCode = place
      .match(/(?:^|[\s,(-])([A-Z]{2})\)?\s*$/)?.[1]
      ?.toLowerCase();
    if (endCode && FAR[endCode]) {
      farIso = endCode;
      farEnd = f.length;
    }
    const stateEnd =
      endCode &&
      (US_STATES.has(endCode) ||
        (STATE_CODES[endCode] && euro && euro.iso !== endCode))
        ? f.length
        : -1;
    // ➤ The last part that is not the country itself, and the first.
    const parts = f
      .split(/,|\s[-–]\s/)
      .map((s) => s.trim())
      .filter(Boolean);
    while (parts.length > 1 && US_NAMED.test(parts.at(-1) ?? "")) parts.pop();
    if (
      A_STATE.test(parts.at(-1) || "") ||
      OPENS_US.test(f) ||
      OPENS_US_CODE.test(place)
    ) {
      farIso = "us";
      farEnd = f.length;
    }
    if (euro && euroEnd > Math.max(farEnd, stateEnd))
      return { cc: euro.iso, european: euro };
    far ||= farIso;
  }
  return far ? { cc: far } : null;
}

// ➤ In this order: a European country named, a country outside Europe named or coded
// ➤ ("Rockville, MD, US"), a European country coded (unless the code reads as a US state or
// ➤ a Canadian province), then a US state's code, then the word "remote" (a remote job in
// ➤ a named country stays in that country), then a known city in Europe, then a big city
// ➤ outside it. What names nothing known keeps its text as the city and no country. inTitle:
// ➤ the place is read off an advert's title, where codes are mostly modules and acronyms.
// ➤ namesOnly reads names only, no two capitals as a country ("IT Support", "HR", "DE/EN");
// ➤ "UK" and "US" are names, and so is a list of US states ("Remote in MI, OH, IN").
const CODE_LIST = /(?<![\p{L}\d])[A-Z]{2}(?:\s*,\s*[A-Z]{2})+(?![\p{L}\d])/gu;
// ➤ Each answer a copy of the one remembered: a record changes the place it is given (a remote job's 'xx').
export type PlaceRead = { cc: string; city: string };
type PlaceOptions = { inTitle?: boolean; namesOnly?: boolean };
export function placeOf(
  location: unknown,
  compiled: Compiled[],
  options: PlaceOptions = {},
): PlaceRead {
  const kind = `place${options.inTitle ? " in a title" : ""}${options.namesOnly ? ", names only" : ""}`;
  return {
    ...remember(compiled, kind, String(location ?? ""), () =>
      readPlace(location, compiled, options),
    ),
  };
}

function readPlace(
  location: unknown,
  compiled: Compiled[],
  { inTitle = false, namesOnly = false }: PlaceOptions = {},
): PlaceRead {
  if (
    namesOnly &&
    [...String(location || "").matchAll(CODE_LIST)].some((m) =>
      m[0].split(/\s*,\s*/).every((c) => US_STATES.has(c.toLowerCase())),
    )
  ) {
    return {
      cc: "us",
      city: shownPlace(String(location).split(",")[0].trim()),
    };
  }
  const raw = (
    !namesOnly
      ? String(location || "")
      : String(location || "").replace(
          /(?<![\p{L}\d])[A-Z]{2}(?![\p{L}\d])/gu,
          (code) => (code === "UK" || code === "US" ? code : " "),
        )
  ).trim();
  const f = fold(raw);
  if (!raw) return { cc: "", city: "" };
  // ➤ Places are separated by commas, semicolons, slashes or bars ("Fort Myers, FL; Naples, FL").
  // ➤ A postcode or a street's direction is not a code ("Gouda, NL, 2801 SC", "1910 SE Federal Hwy").
  const isoHit = withoutTail(raw).match(
    /(?:^|[\s,;/|(-])([A-Z]{2})(?=$|[\s,;/|)-])/g,
  );
  const codes = new Set(
    (isoHit || []).map((s) => s.replace(/[^A-Z]/g, "").toLowerCase()),
  );
  // ➤ The country's code comes last ("Erfurt, TH, DE"): a code before it is a region's.
  const lastCode = isoHit
    ? (isoHit.at(-1) ?? "").replace(/[^A-Z]/g, "").toLowerCase()
    : "";
  const city = shownPlace(firstPart(raw));
  const cut =
    raw.match(/,\s*(\p{L}{3,4}),\s*Un\s*$/u)?.[1]?.toLowerCase() ?? "";
  if (/^(?:engl|scot|wale)$/.test(cut)) return { cc: "gb", city };
  if (!EITHER_CUT.has(cut) && US_CUT.has(cut)) return { cc: "us", city };
  const named = namedCountry(raw, compiled);
  if (named?.european)
    return { cc: named.cc, city: cityIn(raw, named.european) };
  if (named) return { cc: named.cc, city };
  // ➤ A European country's code in small letters ending the place ("Karlsdorf, BW, de",
  // ➤ "Barcelona, CT, es"): the region's code before it is not a US state.
  const endIso =
    !namesOnly && withoutTail(raw).match(/,\s*([a-z]{2})\s*$/)?.[1];
  const endCountry = endIso && compiled.find((c) => c.iso === endIso);
  if (endCountry) return { cc: endCountry.iso, city: cityIn(raw, endCountry) };
  for (const iso of Object.keys(FAR))
    if (lastCode === iso) return { cc: iso, city };
  if (CA_PROVINCES.has(lastCode)) return { cc: "ca", city };
  // ➤ The last code that is a European country's, as in "Frosinone, FR, IT" or "Bern, BE, CH",
  // ➤ place by place: a place whose last code is a US state's is American ("New York, MC,
  // ➤ Austin, TX": the MC is not Monaco), and a list keeps its first European place ("Munich,
  // ➤ DE; Austin, TX"). Not in a title, where "SAP FI + CO oder SD" names SAP's modules.
  for (const segment of withoutTail(raw).split(/[;|]|\s\/\s/)) {
    const segmentCodes = (
      segment.match(/(?:^|[\s,;/|(-])([A-Z]{2})(?=$|[\s,;/|)-])/g) || []
    ).map((s) => s.replace(/[^A-Z]/g, "").toLowerCase());
    if (!inTitle && US_STATES.has(segmentCodes.at(-1) ?? "")) continue;
    for (const code of segmentCodes.reverse()) {
      const c = compiled.find((k) => k.iso === code);
      if (!c) continue;
      const state =
        STATE_CODES[c.iso] && !(c.cityRe && c.cityRe.test(f))
          ? STATE_CODES[c.iso]
          : STATE_TOWN_RES[c.iso]?.test(f)
            ? c.iso === "de"
              ? "us"
              : "ca"
            : "";
      return state ? { cc: state, city } : { cc: c.iso, city: cityIn(raw, c) };
    }
  }
  if ([...codes].some((c) => US_STATES.has(c))) return { cc: "us", city };
  if (DE_STATES.test(f))
    return {
      cc: "de",
      city: cityIn(
        raw,
        compiled.find((c) => c.iso === "de") || { cities: [], name: "" },
      ),
    };
  for (const [iso, re] of NATIONWIDE)
    if (re.test(f)) return { cc: iso, city: "" };
  if (
    /(?:^|[^a-z])remote(?![a-z])|home ?office|teletrabajo|teletravail|homeoffice|thuiswerk|distans/.test(
      f,
    )
  )
    return { cc: "xx", city: "" };
  for (const c of compiled)
    if (c.cityRe && c.cityRe.test(f))
      return { cc: c.iso, city: cityIn(raw, c) };
  for (const [iso, re] of FAR_CITY_RES)
    if (re.test(f)) return { cc: iso, city };
  return { cc: "", city };
}

// ➤ A place's first part, its town where it names one, without a postcode before it.
const firstPart = (raw: string) =>
  (raw.split(",")[0] ?? "").replace(POSTCODE_BEFORE_TOWN, "").trim();
function cityIn(
  raw: string,
  c: {
    name: string;
    cities?: string[];
    cityRes?: [string, RegExp][];
    siteNames?: (string | undefined)[];
  },
) {
  const f = fold(raw);
  for (const [city, re] of c.cityRes || []) if (re.test(f)) return city;
  const first = firstPart(raw);
  return /^[A-Z]{2}$/.test(first) ||
    [c.name, ...(c.siteNames || [])].some((n) => fold(n ?? "") === fold(first))
    ? ""
    : shownPlace(first);
}

// ➤ The place a card names: a list of places longer than forty letters names the first ones whole and how many more
// ➤ ("Poland / Ukraine / Israel +4"); one place is shown whole, however long, never half a name (NOA-20).
function shownPlace(place: string) {
  if (place.length <= 40) return place;
  const places = place.split(/\s\/\s/);
  if (places.length < 2) return place;
  let shown = places[0] ?? "",
    n = 1;
  while (
    n < places.length &&
    `${shown} / ${places[n]} +${places.length - n - 1}`.length <= 40
  )
    shown += ` / ${places[n++]}`;
  return `${shown} +${places.length - n}`;
}

// ➤ Codes that are also words of the trades in a title: information technology, human resources, business analyst, Active
// ➤ Directory, artificial intelligence, business intelligence, quality assurance, electrical engineering, SAP Finance…
const TRADE_CODES = new Set([
  "ad",
  "ai",
  "ba",
  "be",
  "bi",
  "cv",
  "ee",
  "fi",
  "hr",
  "is",
  "it",
  "ma",
  "md",
  "me",
  "ms",
  "mt",
  "pm",
  "pr",
  "qa",
  "sa",
  "se",
  "sm",
]);
// ➤ The countries' codes (ISO 3166-1): a source that declares "UN" or "PO" (SuccessFactors cuts
// ➤ "United Kingdom" and "Poland" to two letters) has declared none.
const COUNTRY_CODES = new Set(
  "ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw".split(
    " ",
  ),
);

// ➤ The country of the site an advert is on, from its domain: a country's domain (".fr",
// ➤ ".co.uk") is "a strong signal ... that your site is explicitly intended for a certain
// ➤ country" (Google Search Central). Not the ones Google reads as generic (".me", ".io", ".co"),
// ➤ nor job platforms on a country's domain ("acme.jobs.personio.de", "acme.breezy.hr").
const GENERIC_DOMAINS = new Set(
  "ad ai as bz cc cd co dj fm io la me ms nu sc sr su tv tk ws".split(" "),
);
const PLATFORMS =
  /(?:^|\.)(?:personio\.de|softgarden\.de|dvinci\.de|breezy\.hr|milchundzucker\.de)$/;
function siteCountry(url: string, compiled: Compiled[]) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "";
  }
  const tld = host.split(".").pop() ?? "";
  const cc = tld === "uk" ? "gb" : tld;
  return !GENERIC_DOMAINS.has(tld) &&
    !PLATFORMS.test(host) &&
    compiled.some((c) => c.iso === cc)
    ? cc
    : "";
}
// ➤ Europe as a whole, alone ("Europe", "European Union", "EU").
const EUROPE_WIDE =
  /^(?:europe|european union|eu|europa|pan european|europe wide)$/;

// ➤ SuccessFactors cuts the country to its name's first two letters ("Wernigerode, Sach, Ge",
// ➤ "Nanjing, Jian, Ch"): "Ge" is Germany, not Georgia's code, and "Ch" China or Chile, not
// ➤ Switzerland. The countries whose names begin so: ours by any name the catalogue gives them
// ➤ ("Deutschland" and "Denmark" for "De"), the others by their English name. Null when no name
// ➤ begins so ("Pt" is a code written that way).
const ENGLISH = new Intl.DisplayNames(["en"], { type: "region" });
type Cut = { ours: Set<string>; others: Set<string> } | null;
const cuts = new WeakMap<Compiled[], Map<string, Cut>>();
function cutCountries(location: unknown, compiled: Compiled[]): Cut {
  const letters = String(location || "").match(
    /,\s*\p{L}{2,4},\s*(\p{Lu}\p{Ll})\s*$/u,
  )?.[1];
  if (!letters) return null;
  const known = cuts.get(compiled) ?? new Map<string, Cut>(),
    k = fold(letters);
  cuts.set(compiled, known);
  if (!known.has(k)) {
    const ours = new Set(
      compiled
        .filter((c) => c.names.some((n) => fold(n).startsWith(k)))
        .map((c) => c.iso),
    );
    const others = new Set(
      [...COUNTRY_CODES].filter(
        (c) =>
          !compiled.some((o) => o.iso === c) &&
          fold(ENGLISH.of(c.toUpperCase()) || "").startsWith(k),
      ),
    );
    known.set(k, ours.size || others.size ? { ours, others } : null);
  }
  return known.get(k) ?? null;
}

// ➤ The place an advert's address carries when its page names none: Workday's
// ➤ ".../job/Krakow-Lesser-Poland-Poland/Domain-Architect_JR36358" and SuccessFactors'
// ➤ ".../job/Gdansk-Bid-Manager/1382162633/", whose first words are the town. "Remote" there
// ➤ is a mode, not a place ("San-Antonio-Home-Office" is a building). Answers { cc, said } or
// ➤ null.
function placeInAddress(
  url: string,
  compiled: Compiled[],
  everywhere: Everywhere,
): { cc: string; said: string } | null {
  let address: URL;
  try {
    address = new URL(url);
  } catch {
    return null;
  }
  const path = (() => {
    try {
      return decodeURIComponent(address.pathname);
    } catch {
      return address.pathname;
    }
  })();
  const workday =
    address.hostname.endsWith("myworkdayjobs.com") &&
    path.match(/\/job\/([^/]+)\/[^/]+$/)?.[1];
  if (workday) {
    const parts = workday.replace(/---/g, ", ");
    const named = placeOf(parts.replace(/-/g, " "), compiled);
    if (named.cc && named.cc !== "xx")
      return { cc: named.cc, said: named.city };
    return (
      countryOfTown(parts, everywhere) ||
      countryOfTown(parts.replace(/-/g, " "), everywhere)
    );
  }
  const words = path.match(/\/job\/([^/]+)\/\d+\/?$/)?.[1]?.split("-") || [];
  // ➤ SuccessFactors ends some with the region and the postcode: "...-Technician-MI-48170"
  // ➤ (Plymouth, Michigan), "...-Engineer-Alab-35210" (Birmingham, Alabama).
  const region =
    /^\d{5}$/.test(words.at(-1) ?? "") && words.at(-2)?.toLowerCase();
  if (region && (US_STATES.has(region) || US_CUT.has(region)))
    return { cc: "us", said: words[0] ?? "" };
  if (!words.length) return null;
  const opening = words.slice(0, 3).join(" ");
  const named = placeOf(opening, compiled, { inTitle: true, namesOnly: true });
  if (named.cc && named.cc !== "xx")
    return { cc: named.cc, said: named.city || opening };
  for (let n = Math.min(3, words.length); n > 0; n--) {
    const town =
      countryOfTown(words.slice(0, n).join(" "), everywhere) ||
      countryOfTown(words.slice(0, n).join("-"), everywhere);
    if (town) return town;
  }
  return null;
}

// ➤ Company boards often put the place in the title ("Site Engineer - Lyon, France"): when the
// ➤ location names no country, the names in the title's tail are read the same way, and then a
// ➤ country of ours named anywhere in it ("... located at Ramstein Air Base, Germany"). What the
// ➤ advert says beats what its source declares (a British recruiter's advert for Singapore is in
// ➤ Singapore); the declared country comes next, when it is one; then the town the location
// ➤ names, or, when it names none, the place the address carries, in GeoNames (`everywhere`,
// ➤ builder/towns.ts: "Heverlee" is in Belgium). "Remote" in the title says how, not where: it
// ➤ counts after those. Last, a country's code in the title, as often an acronym ("IT", "HR",
// ➤ "SAP FI") as a country. A place SuccessFactors cut leaves a few countries, and every clue
// ➤ must name one of them ("Berlin, BE, De" is not Belgium).
// ➤ A place the map knows in that country: one of its big towns, a town of the towns list by any of its names,
// ➤ or one of its regions or provinces ("Scotland", "Zuid-Holland").
function knownTown(
  cc: string,
  city: string,
  compiledCountries: Compiled[],
  everywhere: Everywhere | null,
) {
  const k = fold(city);
  if (
    compiledCountries
      .find((c) => c.iso === cc)
      ?.cityRes?.some(([, re]) => re.test(k))
  )
    return true;
  return Boolean(
    everywhere?.byName.get(k)?.some((t) => t.cc === cc) ||
    everywhere?.areas?.get(cc)?.has(k),
  );
}

// ➤ A list of places ("Paris / Singapore / New York", "London OR Berlin", "United States, Portugal, India") is in Europe
// ➤ when one of them is: the job is open there too. Read as the last place named, 700-odd such adverts were kept out
// ➤ ("OR" read as Oregon; the offers' diary, 1 November 2026). Commas make a list only of countries alone, never of a
// ➤ town and its region ("Vienna, VA, USA").
const LIST_EDGE = /\s+\/\s+|\s*;\s*|\s+\|\s+|\s+(?:or|OR|Or|ou|oder)\s+/;
function europeanInList(
  location: unknown,
  compiled: Compiled[],
  ours: (cc: string) => boolean,
) {
  const text = String(location || "");
  let parts = text
    .split(LIST_EDGE)
    .map((s) => s.trim())
    .filter((p) => p && !NO_PLACE.test(fold(p)));
  if (parts.length < 2) {
    const commas = text
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (commas.length < 2 || !commas.every((p) => aCountry(p, compiled)))
      return null;
    parts = commas;
  }
  for (const p of parts) {
    const r = placeOf(p, compiled);
    if (ours(r.cc)) return r;
  }
  return null;
}
// ➤ A part that names a country whole, and nothing else: not a town that shares a country's name in a US state
// ➤ ("Holland, Michigan", "Turkey, Texas"), not a region named after one ("New South Wales"), not a code ("AR").
const FAR_WORDS = new Set(
  [...Object.values(FAR), ...Object.values(FAR_BY_NAME)].flat(),
);
const aCountry = (p: string, compiled: Compiled[]) => {
  const f = fold(p)
    .replace(/[^a-z' ]+/g, " ")
    .trim();
  return (
    f.length > 3 &&
    !A_STATE.test(f) &&
    (FAR_WORDS.has(f) ||
      US_NAMED.test(f) ||
      compiled.some((c) => c.names.some((n) => fold(n) === f)))
  );
};
// ➤ A list's part, or a town, that names no place ("Other, GB", "Any location", «Various»).
const NO_PLACE = /^(?:other|others|any|various|all)(?![a-z])/;

// ➤ Where an advert that names only its town is likely to be, for a town of the same name in several countries that
// ➤ none outweighs ("Heidelberg" in Germany and in South Africa, "Massy", "Saint-Denis"): its site's country domain, the
// ➤ language its source declares, and the gender mark of its title, «(m/w/d)» in the German-speaking countries, «H/F» in
// ➤ the French-speaking ones, «(m/v/x)» in the Dutch-speaking ones. Such towns left 1,765 offers with no country
// ➤ (the offers' diary, 1 November 2026). None of these: no hint.
const SPOKEN_IN: Places = {
  de: ["de", "at", "ch", "li", "lu"],
  fr: ["fr", "be", "ch", "lu", "mc"],
  nl: ["nl", "be"],
  it: ["it", "ch", "sm"],
  es: ["es", "ad"],
  ca: ["es", "ad"],
  pt: ["pt"],
  pl: ["pl"],
  cs: ["cz"],
  sk: ["sk"],
  hu: ["hu"],
  ro: ["ro", "md"],
  sv: ["se", "fi"],
  da: ["dk", "fo"],
  no: ["no"],
  fi: ["fi"],
  el: ["gr", "cy"],
  hr: ["hr", "ba"],
  sl: ["si"],
  bg: ["bg"],
  lt: ["lt"],
  lv: ["lv"],
  et: ["ee"],
};
const GENDER_MARKS: [RegExp, string][] = [
  [
    /\(\s*(?:m\s*\/\s*w\s*\/\s*[dx]|w\s*\/\s*m\s*\/\s*[dx]|m\s*\/\s*f\s*\/\s*d|d\s*\/\s*m\s*\/\s*w)\s*\)/i,
    "de",
  ],
  [/(?:^|[^a-z])(?:h\s*\/\s*f|f\s*\/\s*h)(?![a-z])/i, "fr"],
  [/\(\s*m\s*\/\s*v(?:\s*\/\s*x)?\s*\)/i, "nl"],
];
function hintedCountries(raw: RawOffer, compiled: Compiled[]) {
  const out = new Set<string>();
  const site = siteCountry(raw.url, compiled);
  if (site) out.add(site);
  for (const cc of SPOKEN_IN[raw.lang ?? ""] || []) out.add(cc);
  for (const [mark, lang] of GENDER_MARKS)
    if (mark.test(String(raw.title || "")))
      for (const cc of SPOKEN_IN[lang] ?? []) out.add(cc);
  return out.size ? out : null;
}

// ➤ An Italian town with its province's code in brackets («Palermo (PA)», «Milano (MI)», «Besana Brianza (MB)»), a code
// ➤ that is also a US state's, a Canadian province's or a country's: Italy's when its source, language or site is, or when
// ➤ Italy has a town of that very name. Read by the code, 330 stored adverts were placed outside Europe or nowhere, 117 of
// ➤ them from Italian sources (the offers' diary, 1 November 2026); without such a sign the code reads as before
// ➤ ("Portland (OR)").
const PROVINCE_IN_BRACKETS = /^\s*([^(),;/|]{2,60}?)\s*\(([A-Z]{2})\)\s*$/;
// ➤ Each Italian province's code and its region as the map names it: a town in brackets with a code is Italy's when
// ➤ Italy has a town of that name in that province's region («Firenze (FI)», «Bergamo (BG)»), and not when the name is
// ➤ another region's («Florence (AL)» is Alabama's, «Milan (TN)» Tennessee's: NO1-07).
const IT_PROVINCE_REGION: Record<string, string> = Object.fromEntries(
  Object.entries({
    Sicily: "ag cl ct en me pa rg sr tp",
    Piedmont: "al at bi cn no to vb vc",
    "The Marches": "an ap fm mc pu",
    "Aosta Valley": "ao",
    Tuscany: "ar fi gr li lu ms pi po pt si",
    Campania: "av bn ce na sa",
    Apulia: "ba bt br fg le ta",
    Veneto: "bl pd ro tv ve vr vi",
    Lombardy: "bg bs co cr lc lo mn mi mb pv so va",
    "Emilia-Romagna": "bo fe fc mo pr pc ra re rn",
    "Trentino-Alto Adige": "bz tn",
    Sardinia: "ca ci vs og ot nu or ss su",
    Molise: "cb is",
    Calabria: "cz cs kr rc vv",
    Abruzzo: "ch aq pe te",
    Lazio: "fr lt ri rm vt",
    Liguria: "ge im sp sv",
    "Friuli Venezia Giulia": "go pn ts ud",
    Basilicate: "mt pz",
    Umbria: "pg tr",
  }).flatMap(([region, codes]) =>
    codes.split(" ").map((code) => [code, region]),
  ),
);
const IT_PROVINCES = new Set(Object.keys(IT_PROVINCE_REGION));
const italianSign = (raw: RawOffer, compiled: Compiled[]) =>
  raw.country === "it" ||
  raw.lang === "it" ||
  siteCountry(raw.url, compiled) === "it";
// ➤ Whether Italy has the town in the province's region: null when the map has no Italian town of that name.
const inProvince = (
  town: string,
  code: string,
  everywhere: Everywhere | null,
) => {
  const named = (everywhere?.byName.get(fold(town)) || []).filter(
    (t) => t.cc === "it",
  );
  return named.length
    ? named.some((t) => t.region === IT_PROVINCE_REGION[code])
    : null;
};
const italianTown = (
  raw: RawOffer,
  town: string,
  compiled: Compiled[],
  everywhere: Everywhere | null,
  signOnly = false,
) =>
  italianSign(raw, compiled) ||
  (!signOnly &&
    (Boolean(
      everywhere?.byName
        .get(fold(town))
        ?.some((t) => t.cc === "it" && fold(t.name) === fold(town)),
    ) ||
      Boolean(
        compiled
          .find((c) => c.iso === "it")
          ?.cityRes?.some(([, re]) => re.test(fold(town))),
      )));

const EUROPE_WORD =
  /(?<![a-z])(?:europe|european|europa|eu|emea|eea|uk)(?![a-z])/;

const letters = (s: unknown) =>
  String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
const hostLetters = (url: unknown) => {
  try {
    return letters(new URL(String(url)).hostname);
  } catch {
    return "";
  }
};

// ➤ A town on a site of one of our countries' domains (newwork-hr.ch) whose stated country has it smaller, or not at all,
// ➤ than the domain's country does is the domain's: «Genève, FR», «Fribourg, FR», where FR is the canton (about 160
// ➤ published offers in France, 7 November 2026).
const biggestIn = (city: string, cc: string, everywhere: Everywhere | null) =>
  Math.max(
    0,
    ...(everywhere?.byName.get(fold(city)) || [])
      .filter((t) => t.cc === cc)
      .map((t) => t.pop || 0),
  );
// ➤ The country the source declares settles a town its map has there too: Santiago de Compostela was read as Chile,
// ➤ Guadalajara as Mexico, Lagos as Nigeria and Bergen op Zoom in Norway, 106 such names of 5,000 people or more (NOA-03).
const namesCountry = (location: unknown, cc: string, compiled: Compiled[]) => {
  const f = fold(String(location || ""));
  const ours = compiled.find((c) => c.iso === cc);
  if (ours)
    return ours.names.some(
      (n) =>
        n.length > 2 &&
        new RegExp(
          `(?:^|[^a-z0-9])${fold(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`,
        ).test(f),
    );
  return (FAR[cc] || []).some((n) =>
    new RegExp(`(?:^|[^a-z0-9])${n}(?![a-z0-9])`).test(f),
  );
};
// ➤ A town the map does not know that the advert writes as something else is that thing: the employer's name or its
// ➤ site's («DISNEY» on disneycareers.com, «FERCHAU», «Verwaltung» on verwaltungjobs.de), or the bracket that ends its title
// ➤ («Informatie-analist (Verambtelijking)», «(SAP)», «(SHK)»), a page's last guesses at its place (builder/lib/layout.ts).
// ➤ The pile of 19 November 2026 held 745 such odd towns, all from employers' own sites.
const TITLE_BRACKET = /\(([^()]{2,40})\)\s*$/;
// ➤ Nor is a town of two to four capitals the map does not know: an airport's or an office's code («MAD», «HKI», «ATNC»).
const A_CODE = /^\p{Lu}{2,4}$/u;
function echoesAdvert(city: string, raw: RawOffer) {
  const k = letters(city);
  const name = ` ${fold(String(raw.company || ""))} `;
  return (
    letters(String(raw.title || "").match(TITLE_BRACKET)?.[1]) === k ||
    name.includes(` ${fold(city)} `) ||
    (k.length >= 3 && hostLetters(raw.url).includes(k))
  );
}
export function placeOfAdvert(
  raw: RawOffer,
  compiledCountries: Compiled[],
  everywhere: Everywhere | null = null,
): PlaceRead {
  const placeIn = (r: RawOffer) =>
    withoutFalseTown(
      placeFound(r, compiledCountries, everywhere),
      compiledCountries,
      everywhere,
    );
  const echoed = (p: PlaceRead) =>
    p.city &&
    !knownTown(p.cc, p.city, compiledCountries, everywhere) &&
    (echoesAdvert(p.city, raw) || A_CODE.test(p.city));
  // ➤ The article back before its town («Garriga, La» is La Garriga, not a town Garriga).
  const located = {
    ...raw,
    location: withArticle(raw.location, everywhere?.byName),
  };
  let place = placeIn(located);
  // ➤ The place the rest of the location names, if any («DISNEY, Marne-la-Vallée»).
  if (echoed(place)) {
    const rest = String(located.location || "")
      .replace(place.city || "", "")
      .replace(/^[\s,;|/–-]+/, "");
    const again = rest ? placeIn({ ...located, location: rest }) : place;
    place = echoed(again) ? { ...again, city: "" } : again;
  }
  const declared = String(raw.country || "").toLowerCase();
  if (
    place.city &&
    declared &&
    declared !== place.cc &&
    compiledCountries.some((c) => c.iso === declared) &&
    knownTown(declared, place.city, compiledCountries, everywhere)
  )
    return { cc: declared, city: place.city };
  // ➤ Not when the location names its country in words («Córdoba, Argentina», «Halle, Belgium»): the rule is for a
  // ➤ canton's two letters read as a country (NOA-06).
  const site =
    place.city &&
    everywhere &&
    !namesCountry(raw.location, place.cc, compiledCountries)
      ? siteCountry(raw.url, compiledCountries)
      : "";
  if (
    site &&
    site !== place.cc &&
    biggestIn(place.city, site, everywhere) >
      biggestIn(place.city, place.cc, everywhere)
  )
    return { cc: site, city: place.city };
  return place;
}
type Found = { cc: string; city?: string } | null | false | undefined | "";
function placeFound(
  raw: RawOffer,
  compiledCountries: Compiled[],
  everywhere: Everywhere | null,
): PlaceRead {
  const cut = cutCountries(raw.location, compiledCountries);
  const ours = (cc: string | undefined) =>
    compiledCountries.some((c) => c.iso === cc);
  const fits = (r: Found): r is { cc: string; city?: string } =>
    Boolean(
      r &&
      r.cc &&
      (!cut || r.cc === "xx" || cut.ours.has(r.cc) || cut.others.has(r.cc)),
    );
  // ➤ A title names a town only by a name the map knows: the rest of a title is not one ("FOURTH ENGINEER
  // ➤ (STCW III/1) pentru nava de tip RO-RO CARGO, Pavilion Italia" is in Italy, with no town). Of the store's European
  // ➤ adverts, 4,246 lost such a town and none its country: "m/w/d", "Países Bajos", "Football" (30 October 2026).
  const titleTown = (r: PlaceRead) =>
    r.city && !knownTown(r.cc, r.city, compiledCountries, everywhere)
      ? { ...r, city: "" }
      : r;
  const place = placeOf(raw.location, compiledCountries);
  const province = String(raw.location || "").match(PROVINCE_IN_BRACKETS);
  const [, named = "", code = ""] = province ?? [];
  if (province && IT_PROVINCES.has(code.toLowerCase())) {
    const town = named.trim(),
      there = inProvince(town, code.toLowerCase(), everywhere);
    if (there) return { cc: "it", city: town };
    if (
      !ours(place.cc) &&
      italianTown(
        raw,
        town,
        compiledCountries,
        there === false ? null : everywhere,
        there === false,
      )
    )
      return { cc: "it", city: town };
    // ➤ Italy's name for a town elsewhere, the code another country's: read as «town, code» («Florence, AL»).
    if (
      there === false &&
      place.cc === "it" &&
      !italianSign(raw, compiledCountries)
    )
      return placeOf(`${town}, ${code}`, compiledCountries);
  }
  // ➤ A remote job whose title names a country outside Europe and nothing of Europe ("Canada Residents - AI Trainers -
  // ➤ Kelowna, Canada", "[USA resident living in Houston - Texas]") is there: 69 were shown as remote in Europe (the text
  // ➤ corpus, 1 November 2026). "Remote (US or Europe)" stays a remote job.
  // ➤ The country by its name or as the US writes itself, not by a code that is also a word ("QA" is no Qatar, "AR" no
  // ➤ Argentina).
  if (place.cc === "xx") {
    const title = String(raw.title || ""),
      said = fold(title);
    const titled = namedCountry(title, compiledCountries);
    const byName =
      titled &&
      ((FAR[titled.cc] || []).some((n) =>
        new RegExp(`(?<![a-z])${n}(?![a-z])`).test(said),
      ) ||
        (titled.cc === "us" &&
          /(?<![A-Za-z])(?:US|USA|U\.S\.)(?![A-Za-z])/.test(title)));
    if (
      byName &&
      !titled.european &&
      !EUROPE_WORD.test(said) &&
      !EUROPE_WORD.test(fold(String(raw.location || "")))
    )
      return { cc: titled.cc, city: "" };
  }
  if (!ours(place.cc)) {
    const listed = europeanInList(raw.location, compiledCountries, ours);
    if (listed) return listed;
  }
  if (fits(place as Found)) return place;
  const city = place.city;
  // ➤ A cut place that begins like no country of ours is outside Europe ("Ras Zuwayed, Bahr, Ba").
  if (cut && !cut.ours.size) return { cc: [...cut.others][0] ?? "", city };
  // ➤ Two capitals joined to others by "&" are an acronym, not a country's code: "Electrical
  // ➤ Engineer - MC & I - Oil and Gas" is a department, not Monaco. Nor is Java's "Jakarta EE" a
  // ➤ town.
  const tail = String(raw.title || "")
    .split(/\s[-–|(]\s?|\(/)
    .slice(1)
    .join(", ")
    .replace(/\)/g, "")
    .replace(/\b[A-Z]{1,2}\s?&\s?[A-Z]{1,2}\b/g, " ")
    .replace(/\bJakarta(?=\s+EE\b)/gi, " ");
  const fromTail = tail
    ? placeOf(tail, compiledCountries, { inTitle: true, namesOnly: true })
    : { cc: "", city: "" };
  if (fits(fromTail) && fromTail.cc !== "xx") return titleTown(fromTail);
  const titled = namedCountry(String(raw.title || ""), compiledCountries);
  if (titled?.european && fits(titled)) return { cc: titled.cc, city: "" };
  if (
    !cut &&
    raw.country &&
    (COUNTRY_CODES.has(raw.country) || ours(raw.country))
  ) {
    return {
      cc: raw.country,
      city:
        raw.city ||
        cityIn(
          raw.location || "",
          compiledCountries.find((c) => c.iso === raw.country) || {
            cities: [],
            name: "",
          },
        ),
    };
  }
  const allowed = cut && new Set([...cut.ours, ...cut.others]);
  const hints =
    everywhere && !allowed && hintedCountries(raw, compiledCountries);
  const town =
    everywhere &&
    (countryOfTown(raw.location, everywhere, allowed) ||
      (hints && countryOfTown(raw.location, everywhere, hints)) ||
      (!String(raw.location || "").trim() &&
        placeInAddress(raw.url, compiledCountries, everywhere)));
  if (fits(town) && "said" in town) return { cc: town.cc, city: town.said };
  // ➤ Else a region or a province only one of our countries has (builder/towns.ts).
  const region =
    everywhere &&
    !allowed &&
    hints &&
    countryOfArea(raw.location, everywhere, hints);
  if (fits(region)) return { cc: region.cc, city: "" };
  // ➤ A cut place that begins like one country of ours and no big one elsewhere ("Fr", "Ge") is
  // ➤ there, though its town is not on the map.
  if (cut && cut.ours.size === 1 && ![...cut.others].some((c) => FAR[c]))
    return { cc: [...cut.ours][0] ?? "", city };
  // ➤ A place that says only "Europe" is a remote job in Europe: boards write it for the time zone
  // ➤ (of 187 such adverts asked of their sources on 2 October 2026, 143 remote, 8 naming several
  // ➤ places). When the source says on site or hybrid, it is in an office whose country it does
  // ➤ not say ('zz', "Country not stated"). An employer's own site on a country's domain is in
  // ➤ that country when the advert names no place (keoni.fr, silven.co.uk).
  if (
    EUROPE_WIDE.test(
      fold(String(raw.location || ""))
        .replace(/[^a-z]+/g, " ")
        .trim(),
    )
  )
    return { cc: ["o", "h"].includes(workModeOf(raw)) ? "zz" : "xx", city: "" };
  const site = siteCountry(raw.url, compiledCountries);
  if (site && fits({ cc: site })) return { cc: site, city };
  // ➤ A country's code in the title counts only alone in brackets ("Structural Engineer (m|f|d) | Tübingen (DE)"), and not a
  // ➤ code that is also a word of the trades: read anywhere in the title's end, a code gave 334 published offers their
  // ➤ country, most of them wrong ("Process Design Engineer - IT", "Business Analyst (BA)", "PL/SQL", "Renewable Gas AD"
  // ➤ for anaerobic digestion; 1 November 2026).
  const bracketed = (String(raw.title || "").match(/\(([A-Z]{2})\)/) ||
    [])[1]?.toLowerCase();
  const coded =
    bracketed && COUNTRY_CODES.has(bracketed) && !TRADE_CODES.has(bracketed)
      ? { cc: bracketed, city: "" }
      : { cc: "" };
  // ➤ A remote job whose title codes a country outside Europe ("Remote ... (PK)") is there.
  if (fromTail.cc === "xx")
    return fits(coded) && coded.cc !== "xx" && !ours(coded.cc)
      ? titleTown({ city: "", ...coded })
      : fromTail;
  return fits(coded) ? titleTown({ city: "", ...coded }) : { cc: "", city };
}
