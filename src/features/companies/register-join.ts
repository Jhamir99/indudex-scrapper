import type { KeptRegisterCompany } from "../../shared/storage/registers-file.js";
import {
  cleanName,
  companyKey,
  displayName,
  nameWords,
  townKey,
} from "./company-key.js";
import {
  type CompanyRow,
  countryOf,
  type DirectoryOffer,
  mainCountry,
  offersAt,
} from "./directory.js";

// The registers' companies joined with the employers of the directory (legacy builder/companies.mjs
// registerJoin and withRegisters, word for word but for types and named row fields).

const site = (url: unknown): string => {
  const u = String(url || "")
    .trim()
    .toLowerCase();
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/.test(
    u.replace(/^https?:\/\//, "").replace(/^www\./, ""),
  )
    ? u.startsWith("http")
      ? u
      : `https://${u}`
    : "";
};

// Words that say where a company of a group is, or which of its units, and not who it is: the
// countries and points of the compass in the registers' languages and English; legal forms the
// key keeps; and the words groups name their units with ("Manufacturing Iberica SAU").
const PLACE_WORDS = new Set([
  "france",
  "francaise",
  "iberica",
  "iberia",
  "espana",
  "spain",
  "espanola",
  "catalunya",
  "cataluna",
  "catalonia",
  "norge",
  "norway",
  "norsk",
  "norden",
  "nordic",
  "nordics",
  "scandinavia",
  "europe",
  "european",
  "europa",
  "international",
  "internationale",
  "emea",
  "deutschland",
  "germany",
  "italia",
  "italy",
  "benelux",
  "belgium",
  "belgique",
  "nederland",
  "netherlands",
  "uk",
  "polska",
  "portugal",
  "sverige",
  "sweden",
  "danmark",
  "denmark",
  "finland",
  "suomi",
  "schweiz",
  "suisse",
  "switzerland",
  "austria",
  "ireland",
  "nord",
  "sud",
  "est",
  "ouest",
  "north",
  "south",
  "east",
  "west",
  "centre",
  "center",
  "atlantique",
  "mediterranee",
]);
const UNIT_WORDS = new Set([
  "sau",
  "eurl",
  "snc",
  "scop",
  "scic",
  "sem",
  "spl",
  "nuf",
  "sll",
  "services",
  "service",
  "solutions",
  "systems",
  "systemes",
  "technologies",
  "technology",
  "tech",
  "industries",
  "industrie",
  "industrial",
  "industriel",
  "industrielle",
  "manufacturing",
  "production",
  "operations",
  "engineering",
  "ingenierie",
  "logistics",
  "logistique",
  "distribution",
  "energy",
  "energie",
  "energies",
  "digital",
  "consulting",
  "conseil",
  "maintenance",
  "management",
  "software",
  "it",
  "data",
  "global",
  "worldwide",
  "sales",
  "trading",
  "commercial",
  "commerciale",
  "fabrication",
]);
// And the words that only say "company" ("SOCIETE" of Paris is no employer called "Société").
const COMPANY_WORDS = new Set([
  "societe",
  "compagnie",
  "entreprise",
  "entreprises",
  "etablissement",
  "etablissements",
  "empresa",
  "firma",
  "selskap",
  "selskapet",
  "company",
]);
const generic = (words: readonly string[]): boolean =>
  words.every(
    (w: string) =>
      PLACE_WORDS.has(w) || UNIT_WORDS.has(w) || COMPANY_WORDS.has(w),
  );
// Legal forms of one country or a few, at the end of a name: a company registered in another is
// not one of them ("Schmidt & Co. GmbH" is not the French SCHMIDT GROUPE; "AG Plomberie" is).
const FORMS = new Map(
  Object.entries({
    gmbh: "de at ch",
    mbh: "de at ch",
    ag: "de at ch",
    kg: "de at ch",
    kgaa: "de at",
    ohg: "de at",
    ug: "de",
    ltd: "gb ie",
    limited: "gb ie",
    plc: "gb ie",
    llp: "gb",
    inc: "us",
    llc: "us",
    bv: "nl be",
    nv: "nl be",
    ab: "se fi",
    oy: "fi",
    oyj: "fi",
    aps: "dk",
    spa: "it",
    srl: "it ro",
    sl: "es",
    slu: "es",
    sas: "fr",
    sasu: "fr",
    sarl: "fr",
    as: "no dk",
    asa: "no",
  }),
);
const formElsewhere = (name: string, country: string): boolean => {
  const last = nameWords(name).at(-1) ?? "";
  const countries = FORMS.get(last);
  return countries !== undefined && !countries.split(" ").includes(country);
};
// Which employer of the list a register's company is, or belongs to, if any (`{ row, same }`),
// from what employer(key) knows of the employer under a key: its row, its own town ("cc|town",
// where most of its offers are), the towns, provinces and countries of its offers today and
// before, and today's towns and regions apart (`now`).
// - The same key, not made only of words any company bears ("International"), nor shown with a
//   legal form of another country, is the company: for a name of one word, in the employer's
//   own town, or, for a company of BIG people or more named with four letters or more, where the
//   employer publishes today in its town or region (Airbus of Blagnac, offers in Toulouse); for a
//   longer one, where the employer has had offers in its town or province, or, for a company of
//   BIG people or more, in its country. "META" of Paris, of 10 people, is not Meta of London.
// - The employer's key, then only words of place or unit ("Barry Callebaut" + "Manufacturing
//   Iberica SAU"), one of them a place unless the employer's name has two words or more, and the
//   employer's offers in the company's town or province: the company belongs to it.
// When unsure, none (docs/research/directory.md).
const BIG = 250; // people: a company this large is known by name where it publishes
// What the join knows of an employer under its key.
export interface KnownEmployer {
  readonly row: CompanyRow;
  // Its own town, "cc|town key", where most of its offers are.
  readonly home: string;
  readonly towns: ReadonlySet<string>;
  readonly places: ReadonlySet<string>;
  readonly countries: ReadonlySet<string>;
  // Today's towns and regions.
  readonly now: {
    readonly towns: ReadonlySet<string>;
    readonly regions: ReadonlySet<string>;
  };
}

export interface Join {
  readonly row: CompanyRow;
  // The company is the employer itself, not one that belongs to it.
  readonly same: boolean;
}

export function registerJoin(
  company: KeptRegisterCompany,
  employer: (key: string) => KnownEmployer | undefined,
  key: string = companyKey(company.name),
): Join | null {
  const words = key.split(" ");
  const town = `${company.country}|${townKey(company.town)}`;
  const near = (known: KnownEmployer) =>
    known.towns.has(town) || known.places.has(company.nuts);
  const same = employer(key);
  if (same) {
    if (generic(words) || formElsewhere(same.row.name, company.country))
      return null;
    const big = (company.people ?? 0) >= BIG;
    const its =
      words.length === 1
        ? same.home === town ||
          (big &&
            key.length >= 4 &&
            (same.now.towns.has(town) ||
              same.now.regions.has(company.nuts.slice(0, 4))))
        : near(same) || (big && same.countries.has(company.country));
    return its ? { row: same.row, same: true } : null;
  }
  for (let i = words.length - 1; i >= 1; i--) {
    const brand = words.slice(0, i);
    const rest = words.slice(i);
    const known = employer(brand.join(" "));
    if (!known) continue;
    if (!generic(rest) || generic(brand) || brand.join("").length < 3)
      return null;
    if (brand.length === 1 && !rest.some((word) => PLACE_WORDS.has(word)))
      return null;
    return near(known) ? { row: known.row, same: false } : null;
  }
  return null;
}

// A register's company listed alone in its country: [name, NUTS 3, town, website].
export type ListedItem = readonly [string, string, string, string];

export interface Registered {
  // Per country, the companies listed alone, by name.
  readonly local: Record<string, ListedItem[]>;
  // Each employer row and the company that is that employer.
  readonly same: Map<CompanyRow, KeptRegisterCompany>;
  // Each company listed, its item, and the employer it belongs to (or null).
  readonly listed: (readonly [
    KeptRegisterCompany,
    ListedItem,
    CompanyRow | null,
  ])[];
}

// The employers joined with the registers (registerJoin), the largest companies first. A company
// that is an employer of the list gives it its town when its country is where most of the
// employer's offers are, and its province at 0 when none of its offers is there; another of the
// same name is that employer's too. Any other is listed in its country's own list, once per key,
// the largest kept. `offers`: today's, all of them. The rows are changed in place.
export function withRegisters(
  employers: readonly CompanyRow[],
  registers: readonly KeptRegisterCompany[],
  offers: Iterable<DirectoryOffer> = [],
): Registered {
  // Only an employer whose key is a register company's, or its first words, can join one.
  const keyOf = new Map(
    registers.map((company) => [company, companyKey(company.name)]),
  );
  const wanted = new Set<string>();
  for (const key of keyOf.values()) {
    const words = key.split(" ");
    for (let i = 1; i <= words.length; i++)
      wanted.add(words.slice(0, i).join(" "));
  }
  const seen = offersAt(offers, wanted);
  const known = new Map<string, KnownEmployer>();
  for (const row of employers) {
    const key = companyKey(row.name);
    if (!wanted.has(key)) continue;
    const today = seen.get(key);
    const home =
      row.town && row.townNuts
        ? `${countryOf(row.townNuts)}|${townKey(row.town)}`
        : "";
    known.set(key, {
      row,
      home,
      towns: new Set([...(today?.towns ?? []), home]),
      places: new Set([
        ...Object.keys(row.places).filter((at) => at.length > 2),
        ...(today?.places ?? []),
      ]),
      countries: new Set(Object.keys(row.places).map(countryOf)),
      now: today ?? { towns: new Set(), regions: new Set() },
    });
  }
  const employer = (key: string) => known.get(key);
  const local: Record<string, ListedItem[]> = Object.create(null) as Record<
    string,
    ListedItem[]
  >;
  const taken = new Set<string>();
  const same = new Map<CompanyRow, KeptRegisterCompany>();
  const listed: (readonly [
    KeptRegisterCompany,
    ListedItem,
    CompanyRow | null,
  ])[] = [];
  for (const company of [...registers].toSorted(
    (a, b) => (b.people ?? 0) - (a.people ?? 0),
  )) {
    const key = keyOf.get(company);
    if (!key) continue;
    const join = registerJoin(company, employer, key);
    if (join?.same) {
      const row = join.row;
      if (same.has(row)) continue;
      same.set(row, company);
      const home = mainCountry(row.places) === company.country;
      if (!Object.hasOwn(row.places, company.nuts))
        row.places[company.nuts] = 0;
      if (home) {
        row.town = company.town;
        row.townNuts = company.nuts;
      }
      continue;
    }
    if (taken.has(`${company.country} ${key}`)) continue;
    taken.add(`${company.country} ${key}`);
    const item: ListedItem = [
      displayName(cleanName(company.name)),
      company.nuts,
      company.town,
      site(company.website),
    ];
    (local[company.country] ??= []).push(item);
    listed.push([company, item, join?.row ?? null]);
  }
  for (const list of Object.values(local))
    list.sort((a, b) => a[0].localeCompare(b[0]));
  return { local, same, listed };
}
