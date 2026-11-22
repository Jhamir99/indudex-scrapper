import type { Offer } from "../../shared/schemas/published/offer.js";

// The pile on disk (FR-6; legacy builder/shard.mjs): one file per family and country, so a search
// downloads only the parts it named; a shard past four million characters split into numbered
// parts (up to some 5 MB in bytes, with the accented letters); and the newest offers apart.

const MAX_CHARACTERS = 4 * 1024 * 1024;
// The newest offers a visitor sees before naming anything, how far back that goes, and its parts:
// the newest 500, the next 1,500, the rest.
const LATEST = 6000;
const LATEST_DAYS = 21;
const LATEST_FIRST = 500;
const LATEST_SECOND = 2000;
// The newest of the skilled trades, for a search with words.
const LATEST_OPTIONAL = 2000;
const DAY_MS = 86_400_000;

export const shardKey = (family: string, country: string): string =>
  `${family}-${country || "zz"}`;

// Newest first, ties by id: the same offers give the same order.
const newestFirst = (a: Offer, b: Offer) =>
  (b.d || "").localeCompare(a.d || "") || a.id.localeCompare(b.id);

// The newest offers of the whole pile, whatever their family or country, back to `days` ago.
export function latestOf(
  offers: readonly Offer[],
  {
    max = LATEST,
    days = LATEST_DAYS,
    now,
  }: { readonly max?: number; readonly days?: number; readonly now: number },
): { offers: Offer[]; since: string } {
  const since = new Date(now - days * DAY_MS).toISOString().slice(0, 10);
  const seen = new Set<string>();
  const out: Offer[] = [];
  for (const offer of offers.toSorted(newestFirst)) {
    if (out.length >= max || (offer.d || "") < since) break;
    if (seen.has(offer.id)) continue;
    seen.add(offer.id);
    out.push(offer);
  }
  return { offers: out, since };
}

// How many offers name each occupation, per family: the specialties the filters list inside a
// family. An occupation's code starts with its family's ("2144.1.14").
export function occupationCounts(
  offers: readonly Offer[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const offer of offers)
    for (const code of offer.e ?? []) {
      const family = code.slice(0, 4);
      if (!offer.f.includes(family)) continue;
      const counts = (out[family] ??= {});
      counts[code] = (counts[code] ?? 0) + 1;
    }
  return out;
}

export interface FamilyEntry {
  label: string;
  group?: string;
  optional?: true;
  countries: Record<string, { files: string[]; n: number; bytes: number }>;
  occupations?: Record<string, number>;
}

export interface Shards {
  // File name ("offers/2144-es.json") → its text.
  readonly files: Map<string, string>;
  readonly families: Record<string, FamilyEntry>;
  readonly latest: {
    files: string[];
    n: number;
    since: string;
    optional?: { files: string[]; n: number };
  };
}

// The offers as files, and the index's blocks of families and of the newest. `optional`: the
// families shown only to a visitor who picks them (marked so, and out of the newest).
export function buildShards(
  offers: readonly Offer[],
  families: readonly {
    readonly id: string;
    readonly label: string;
    readonly group: string;
  }[],
  now: number,
  optional: ReadonlySet<string> = new Set(),
): Shards {
  const groups = new Map<
    string,
    { family: string; country: string; offers: Offer[] }
  >();
  for (const offer of offers)
    for (const family of offer.f) {
      const key = shardKey(family, offer.cc);
      let group = groups.get(key);
      if (!group)
        groups.set(
          key,
          (group = { family, country: offer.cc || "zz", offers: [] }),
        );
      group.offers.push(offer);
    }
  const files = new Map<string, string>();
  const index: Record<string, FamilyEntry> = {};
  const occupations = occupationCounts(offers);
  for (const family of families) {
    const counted = occupations[family.id];
    index[family.id] = {
      label: family.label,
      group: family.group,
      ...(optional.has(family.id) ? { optional: true as const } : {}),
      countries: {},
      ...(counted ? { occupations: counted } : {}),
    };
  }
  for (const [key, group] of groups) {
    group.offers.sort(newestFirst);
    const parts: Offer[][] = [];
    let part: Offer[] = [];
    let size = 0;
    for (const offer of group.offers) {
      const characters = JSON.stringify(offer).length + 1;
      if (size + characters > MAX_CHARACTERS && part.length) {
        parts.push(part);
        part = [];
        size = 0;
      }
      part.push(offer);
      size += characters;
    }
    if (part.length) parts.push(part);
    const names = parts.map(
      (_, i) => `offers/${key}${parts.length > 1 ? `-${i + 1}` : ""}.json`,
    );
    names.forEach((name, i) =>
      files.set(name, JSON.stringify({ v: 1, shard: key, offers: parts[i] })),
    );
    const entry = (index[group.family] ??= {
      label: group.family,
      countries: {},
    });
    entry.countries[group.country] = {
      files: names,
      n: group.offers.length,
      bytes: names.reduce(
        (sum, name) => sum + (files.get(name)?.length ?? 0),
        0,
      ),
    };
  }
  // The newest of the lot, in parts that grow: all three are asked for at once, and the first, the
  // smallest and newest, lands first.
  const isMain = (offer: Offer) =>
    offer.f.some((family) => !optional.has(family));
  const { offers: newest, since } = latestOf(offers.filter(isMain), { now });
  const latestFiles: string[] = [];
  for (const [from, to] of [
    [0, LATEST_FIRST],
    [LATEST_FIRST, LATEST_SECOND],
    [LATEST_SECOND, newest.length],
  ] as const) {
    const part = newest.slice(from, to);
    if (!part.length) continue;
    const name = `offers/latest${latestFiles.length ? `-${latestFiles.length + 1}` : ""}.json`;
    files.set(name, JSON.stringify({ v: 1, shard: "latest", offers: part }));
    latestFiles.push(name);
  }
  // And the newest of the skilled trades apart: a search with words reaches them too.
  const extra = latestOf(
    offers.filter((offer) => !isMain(offer)),
    { max: LATEST_OPTIONAL, now },
  ).offers;
  if (extra.length)
    files.set(
      "offers/latest-optional.json",
      JSON.stringify({ v: 1, shard: "latest-optional", offers: extra }),
    );
  return {
    files,
    families: index,
    latest: {
      files: latestFiles,
      n: newest.length,
      since,
      ...(extra.length
        ? {
            optional: {
              files: ["offers/latest-optional.json"],
              n: extra.length,
            },
          }
        : {}),
    },
  };
}
