import type {
  SourceDefinition,
  SourceKind,
} from "../../shared/schemas/source.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import type {
  CompanyCard,
  CompanyRow,
  ListedItem,
} from "../companies/index.js";
import type { RegionsInUse, TownInUse } from "../places/index.js";
import type { BuildCounts } from "./build.js";
import type { Shards } from "./shards.js";
import { bucketOf, type WordIndexManifest } from "./word-index.js";

// The dataset's files beside the offers (FR-8; legacy builder/build-pile.mjs), each the text the
// legacy wrote: index.json, status.json, places.json, regions.json, companies.json with
// companies/<country>.json, and the cards in 512 files by key.

const HOUR_MS = 3_600_000;
// How long after its last crawl a pile counts as fresh: the web says so past it.
const FRESH_HOURS = 48;

// The legacy's kinds: an employer's careers site or board, a public feed, an intermediary (the
// portals were read as intermediaries too).
export const legacyKind = (kind: SourceKind): string =>
  kind === "careers" ? "board" : kind === "feed" ? "feed" : "via";
export const isIntermediary = (kind: SourceKind): boolean =>
  kind === "portal" || kind === "via";

// Each source read, with its licence and credit.
export function sourcesOf(
  seen: Iterable<string>,
  definitions: ReadonlyMap<string, SourceDefinition>,
) {
  const out: Record<string, Record<string, unknown>> = {};
  for (const id of seen) {
    const source = definitions.get(id);
    if (!source) continue;
    out[id] = {
      name: source.licence.name,
      short: source.licence.short,
      url: source.licence.url,
      licence: source.licence.licence,
      credit: source.licence.credit ?? "",
      needsKey: source.needsCredentials,
      kind: legacyKind(source.kind),
      enabled: true,
      ...(isIntermediary(source.kind) ? { via: true } : {}),
    };
  }
  return out;
}

const byCountry = (offers: readonly Offer[]) => {
  const out: Record<string, number> = {};
  for (const offer of offers)
    out[offer.cc || "zz"] = (out[offer.cc || "zz"] ?? 0) + 1;
  return out;
};

export interface IndexParts {
  readonly generatedAt: string;
  readonly crawledAt: string;
  readonly catalogueVersion: number;
  readonly shards: Shards;
  readonly sources: Record<string, Record<string, unknown>>;
  readonly offers: readonly Offer[];
  readonly main: readonly Offer[];
  readonly counts: BuildCounts;
  readonly isVia: (source: string) => boolean;
  // The source files read, and those of employers' own sites and boards.
  readonly sourceFiles: number;
  readonly boardSources: number;
  readonly seconds: number;
  readonly words: WordIndexManifest;
}

export function indexFile(parts: IndexParts) {
  const crawled = parts.crawledAt || parts.generatedAt;
  const { main } = parts;
  return {
    v: 1,
    generated_at: parts.generatedAt,
    crawled_at: crawled,
    expires_at: new Date(
      Date.parse(crawled) + FRESH_HOURS * HOUR_MS,
    ).toISOString(),
    catalogue_v: parts.catalogueVersion,
    families: parts.shards.families,
    latest: parts.shards.latest,
    sources: parts.sources,
    counts: {
      offers: main.length,
      optional: parts.offers.length - main.length,
      found: parts.counts.found,
      by_country: byCountry(main),
      via: main.filter((offer) => parts.isVia(offer.s)).length,
      sources: parts.sourceFiles,
      companies: parts.boardSources,
      on_map: main.filter((offer) => offer.g).length,
      with_pay: main.filter((offer) => offer.p).length,
      with_mode: main.filter((offer) => offer.w).length,
    },
    status: { ok: parts.offers.length > 0, seconds: parts.seconds },
    words: parts.words,
  };
}

export function statusFile(parts: {
  readonly generatedAt: string;
  readonly crawledAt: string;
  readonly offers: readonly Offer[];
  readonly main: readonly Offer[];
  readonly counts: BuildCounts;
  readonly sourceFiles: number;
  readonly duplicates: { readonly sameUrl: number; readonly sameRole: number };
  readonly optionalFamilies: ReadonlySet<string>;
}) {
  return {
    generated_at: parts.generatedAt,
    crawled_at: parts.crawledAt,
    offers: parts.main.length,
    optional: parts.offers.length - parts.main.length,
    found: parts.counts.found,
    sources: parts.sourceFiles,
    dropped: { ...parts.counts },
    duplicates: parts.duplicates,
    by_country: byCountry(parts.main),
    by_country_optional: byCountry(
      parts.offers.filter((offer) =>
        offer.f.every((family) => parts.optionalFamilies.has(family)),
      ),
    ),
  };
}

// The towns with offers for the search bar: shown name, GeoNames' name when it differs, region,
// country, latitude, longitude, offers, and its names in other languages when it has any; with the
// names it must not take for a town alone.
export const placesFile = (
  towns: readonly TownInUse[],
  ambiguous: readonly string[],
) => ({
  v: 2,
  places: towns.map((town) => {
    const row = [
      town.name,
      town.geonamesName,
      town.region,
      town.country,
      town.latitude,
      town.longitude,
      town.offers,
    ];
    return town.otherNames.length ? [...row, [...town.otherNames]] : row;
  }),
  ambiguous: [...ambiguous],
});

// Each country's areas as arrays: its names, the other names people search it by, its offers last.
const shelves = (tables: RegionsInUse["regions"]) =>
  Object.fromEntries(
    Object.entries(tables).map(([country, areas]) => [
      country,
      Object.fromEntries(
        Object.entries(areas).map(([code, area]) => [
          code,
          [...area.names, ...area.otherNames, area.offers],
        ]),
      ),
    ]),
  );

// The regions and provinces in use.
export const regionsFile = (regions: RegionsInUse) => ({
  v: 1,
  regions: shelves(regions.regions),
  provinces: shelves(regions.provinces),
});

// companies.json (the directory's rows, each group's name in each language, and how many register
// companies each country lists) and companies/<country>.json (those companies).
export function companyFiles(parts: {
  readonly generatedAt: string;
  readonly groups: readonly {
    readonly id: string;
    readonly label: string;
    readonly es?: string | undefined;
    readonly ca?: string | undefined;
    readonly fr?: string | undefined;
    readonly nl?: string | undefined;
    readonly de?: string | undefined;
  }[];
  readonly rows: readonly CompanyRow[];
  readonly local: Readonly<Record<string, readonly ListedItem[]>>;
}): Map<string, unknown> {
  const files = new Map<string, unknown>();
  files.set("companies.json", {
    v: 2,
    generated_at: parts.generatedAt,
    groups: Object.fromEntries(
      // A language the catalogue names no group in is left out, as the legacy's JSON left it.
      parts.groups.map((g) => [
        g.id,
        Object.fromEntries(
          Object.entries({
            en: g.label,
            es: g.es,
            ca: g.ca || g.es,
            fr: g.fr,
            nl: g.nl,
            de: g.de,
          }).filter(([, name]) => name !== undefined),
        ),
      ]),
    ),
    companies: parts.rows.map((row) => [
      row.name,
      row.count,
      row.group,
      row.places,
      row.town,
      row.townNuts,
    ]),
    local: Object.fromEntries(
      Object.entries(parts.local).map(([country, list]) => [
        country,
        list.length,
      ]),
    ),
  });
  for (const [country, list] of Object.entries(parts.local))
    files.set(`companies/${country}.json`, { v: 1, companies: list });
  return files;
}

export const CARD_FILES = 512;

// A card in the legacy's short keys, in the order it wrote them.
const SHORT: Readonly<Record<keyof CompanyCard, string>> = {
  groups: "g",
  families: "f",
  towns: "l",
  townCount: "ln",
  pay: "pay",
  modes: "md",
  activity: "a",
  register: "r",
  people: "p",
  companies: "j",
  employer: "b",
  offersInTown: "n",
  website: "w",
};
export const shortCard = (card: CompanyCard): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(card).map(([key, value]) => [
      SHORT[key as keyof CompanyCard],
      value,
    ]),
  );

// The cards by file (cards/<n>.json), each under its key, the file by the key's FNV-1a.
export function cardFiles(
  cards: ReadonlyMap<string, CompanyCard>,
): Map<string, unknown> {
  const byFile = new Map<number, Record<string, unknown>>();
  for (const [key, card] of cards) {
    if (!Object.keys(card).length) continue;
    const file = bucketOf(key, CARD_FILES);
    let list = byFile.get(file);
    if (!list) byFile.set(file, (list = {}));
    list[key] = shortCard(card);
  }
  return new Map(
    [...byFile].map(([file, list]) => [
      `cards/${file}.json`,
      { v: 2, cards: list },
    ]),
  );
}
