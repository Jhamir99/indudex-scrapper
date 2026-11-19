import { cleanName, companyKey, townKey, usable } from "./company-key.js";
import type { History } from "./history.js";

// The employers the site has listed, for the directory: every one with offers today and every one
// that had some before, each with today's count, the occupation group it hires most for, its places
// and its town (legacy builder/companies.mjs). One employer under one name: "Siemens AG", "SIEMENS"
// and "Siemens" share a key, and the spelling seen most often is the one shown.

// An offer as the directory and the cards read it, from the steps before: the employer's name
// (companies), the families (gate), the country, town and NUTS 3 code (places), the pay (pay) and
// the work mode (advert facts).
export interface DirectoryOffer {
  readonly employer: string;
  readonly families: readonly string[];
  readonly country: string;
  readonly town: string;
  readonly nuts: string | null;
  readonly pay?: {
    readonly low: number;
    readonly high: number;
    readonly currency: string;
    readonly period: string;
  } | null;
  readonly workMode?: string | null;
}

// One employer of the directory (the legacy's row [n, count, g, places, t, tn]).
export interface CompanyRow {
  name: string;
  // Today's offers (0 for an employer that had offers only before).
  count: number;
  group: string;
  // Today's count in each of its places (0 in one it had offers in before): a NUTS 3 code, or a
  // country for offers placed no closer.
  places: Record<string, number>;
  town: string;
  townNuts: string;
}

// Where an offer counts: its province's NUTS 3 code, or its country when it has none.
const placeOf = (offer: DirectoryOffer) =>
  offer.nuts || (offer.country && offer.country !== "zz" ? offer.country : "");

// The most counted, ties by name (the legacy's `most`).
function most<K>(counts: ReadonlyMap<K, number>): K | undefined {
  return [...counts].toSorted(
    (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])),
  )[0]?.[0];
}

const bump = <K>(counts: Map<K, number>, key: K) =>
  counts.set(key, (counts.get(key) ?? 0) + 1);

// A town given in capitals ("BARCELONA") is written as people write it.
const townAsWritten = (town: string) =>
  /\p{Ll}/u.test(town)
    ? town
    : town
        .toLowerCase()
        .replace(
          /(^|[\s\-'’(/])(\p{L})/gu,
          (_, before: string, letter: string) => before + letter.toUpperCase(),
        );

interface Today {
  names: Map<string, number>;
  count: number;
  groups: Map<string, number>;
  places: Record<string, number>;
  towns: Map<string, number>;
}

// Today's offers added to what was known: each employer's name, today's count, its group, its
// places with today's count in each, and the town most of its offers are in with that town's
// NUTS 3 code, the fullest first. `history` is changed in place, and loses any name that is not one
// and any employer taken down (`taken`, the takedowns list's companies).
export function updateCompanies(
  history: History,
  offers: Iterable<DirectoryOffer>,
  groupOf: (family: string) => string,
  day: string,
  taken: (name: string) => boolean = () => false,
): CompanyRow[] {
  const today = new Map<string, Today>();
  for (const key of Object.keys(history)) {
    const name = history[key]?.n ?? "";
    if (!usable(cleanName(name)) || taken(name)) delete history[key];
  }
  // An employer remembered under a key the rules no longer give ("Ørsted A/S") moves to its own.
  for (const key of Object.keys(history)) {
    const remembered = history[key];
    if (!remembered) continue;
    const own = companyKey(cleanName(remembered.n));
    if (own && own !== key) {
      if (!Object.hasOwn(history, own)) history[own] = remembered;
      delete history[key];
    }
  }
  for (const offer of offers) {
    const name = cleanName(offer.employer);
    if (!usable(name)) continue;
    const key = companyKey(name);
    if (!key) continue;
    const employer = today.get(key) ?? {
      names: new Map(),
      count: 0,
      groups: new Map(),
      places: Object.create(null) as Record<string, number>,
      towns: new Map(),
    };
    employer.count++;
    bump(employer.names, name);
    for (const group of new Set(offer.families.map(groupOf).filter(Boolean)))
      bump(employer.groups, group);
    const at = placeOf(offer);
    if (at) employer.places[at] = (employer.places[at] ?? 0) + 1;
    const town = townAsWritten(offer.town);
    if (town && offer.nuts) bump(employer.towns, `${town}\t${offer.nuts}`);
    today.set(key, employer);
  }
  for (const [key, employer] of today) {
    const was = Object.hasOwn(history, key) ? history[key] : undefined;
    const [town = "", townNuts = ""] = (most(employer.towns) ?? "").split("\t");
    history[key] = {
      n: most(employer.names) ?? "",
      g: most(employer.groups) || was?.g || "",
      p: [
        ...new Set([...(was?.p ?? []), ...Object.keys(employer.places)]),
      ].toSorted(),
      t: town || was?.t || "",
      tn: townNuts || (town ? "" : was?.tn || ""),
      seen: day,
    };
  }
  return Object.entries(history)
    .map(([key, remembered]): CompanyRow => {
      const now = today.get(key)?.places ?? {};
      return {
        name: remembered.n,
        count: today.get(key)?.count ?? 0,
        group: remembered.g,
        places: Object.fromEntries(
          remembered.p.map((at) => [at, now[at] ?? 0]),
        ),
        town: remembered.t,
        townNuts: remembered.tn,
      };
    })
    .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// A place's country: its own code for a country, else its NUTS code's first letters (Greece's EL and
// Britain's UK as their ISO codes).
export const countryOf = (at: string): string =>
  /^[a-z]{2}$/.test(at)
    ? at
    : (({ EL: "gr", UK: "gb" } as Record<string, string>)[at.slice(0, 2)] ??
      at.slice(0, 2).toLowerCase());

// The country most of an employer's offers are in, from its places and their counts.
export function mainCountry(
  places: Readonly<Record<string, number>>,
): string | undefined {
  const counts = new Map<string, number>();
  for (const [at, n] of Object.entries(places))
    counts.set(countryOf(at), (counts.get(countryOf(at)) ?? 0) + n);
  return most(counts);
}

export interface OffersAt {
  readonly towns: Set<string>;
  readonly places: Set<string>;
  readonly regions: Set<string>;
}

// Where each employer has offers today: the towns, as "cc|town key", the provinces' NUTS 3 codes and
// the regions' NUTS 2; of the employers `wanted` only, when given.
export function offersAt(
  offers: Iterable<DirectoryOffer>,
  wanted: ReadonlySet<string> | null = null,
): Map<string, OffersAt> {
  const at = new Map<string, OffersAt>();
  const keys = new Map<string, string>();
  const towns = new Map<string, string>();
  const townOf = (country: string, town: string) => {
    const key = `${country}|${town}`;
    if (!towns.has(key)) towns.set(key, `${country}|${townKey(town)}`);
    return towns.get(key) ?? key;
  };
  for (const offer of offers) {
    if (!keys.has(offer.employer))
      keys.set(offer.employer, companyKey(cleanName(offer.employer)));
    const key = keys.get(offer.employer) ?? "";
    if (!key || (wanted && !wanted.has(key))) continue;
    let employer = at.get(key);
    if (!employer)
      at.set(
        key,
        (employer = {
          towns: new Set(),
          places: new Set(),
          regions: new Set(),
        }),
      );
    if (offer.country && offer.town)
      employer.towns.add(townOf(offer.country, offer.town));
    if (offer.nuts) {
      employer.places.add(offer.nuts);
      employer.regions.add(offer.nuts.slice(0, 4));
    }
  }
  return at;
}
