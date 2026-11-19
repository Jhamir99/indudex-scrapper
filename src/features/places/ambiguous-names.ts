// The town names the search bar reads as a town only with "in" before them (or a country after).
// Geoparsing calls it geo/non-geo ambiguity: "Orange" is a company, "Hook" a word in "Hook Up
// Engineer", "OSS" a telecom term, and each is also a town with offers. Every time an offer's title
// or company names a town, the mention is a place when the offer is near that town, when the text
// marks it as one (a separator or a place word before it: "Engineer – Vigo", "(Vigo)", "in Vigo",
// "regio Amersfoort"; a separator or a region word after it: "Köln, NRW", "Łódź province"; last in
// the text: "Softwareentwickler Duisburg"; after the first word of a company's name:
// "Dopravoprojekt Brno a.s."), or when the text names another town too ("Hamburg, München").
// Any other mention is a word, and a name is ambiguous when more than a quarter of the offers that
// name it use it as a word. Legacy builder/place-names.ts; docs/research/single-search.md.
import { nameKey, nameKeys } from "../../shared/kit/fold.js";
import type { TownInUse } from "./in-use.js";
import type { Placement } from "./place-advert.js";

const NEAR_KM = 30;
// Words in the longest town name looked for.
const LONGEST = 4;
// Letters in the shortest: "ST" and "Ed" are not read as towns.
const SHORTEST = 3;
const WORD_SHARE = 0.25;
const BEFORE = /[-–—|(/,@:·•]\s*$/;
const AFTER = /^\s*[-–—|()/,:·•]/;
const REGION_WORDS: ReadonlySet<string> = new Set([
  "province",
  "provincia",
  "provinz",
  "region",
  "regio",
  "area",
  "county",
  "voivodeship",
  "kreis",
  "landkreis",
  "departement",
  "canton",
  "kanton",
  "metropolitan",
]);
const PLACE_WORDS: ReadonlySet<string> = new Set([
  "in",
  "en",
  "i",
  "w",
  "im",
  "near",
  "nahe",
  "nara",
  "naer",
  "nabij",
  "vicino",
  "presso",
  "perto",
  "pres",
  "around",
  "cerca",
  "raum",
  "regio",
  "region",
  "regione",
  "omgeving",
  "zona",
  "area",
]);

type Point = readonly [latitude: number, longitude: number];

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Kilometres between two points by the haversine formula (a sphere of 6,371 km: within half a
// percent, plenty for "30 km around a town").
export function distanceKm(
  [latitude1, longitude1]: Point,
  [latitude2, longitude2]: Point,
): number {
  const a =
    Math.sin(radians(latitude2 - latitude1) / 2) ** 2 +
    Math.cos(radians(latitude1)) *
      Math.cos(radians(latitude2)) *
      Math.sin(radians(longitude2 - longitude1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// The towns by every key of every name, with their points.
export function townNames(
  towns: readonly TownInUse[],
): ReadonlyMap<string, readonly Point[]> {
  const out = new Map<string, Point[]>();
  for (const town of towns) {
    for (const name of [town.name, town.geonamesName, ...town.otherNames]) {
      for (const key of name ? nameKeys(name) : []) {
        if (key.length < SHORTEST) continue;
        const points = out.get(key);
        const point: Point = [town.latitude, town.longitude];
        if (points) points.push(point);
        else out.set(key, [point]);
      }
    }
  }
  return out;
}

export interface Mention {
  readonly key: string;
  readonly place: boolean;
}

// The towns a text names, the longest name first at each word and none inside another, each
// marked as a place or a word. `point`: the offer's own town; `company`: the text is a company's
// name.
export function namesIn(
  text: string,
  towns: ReadonlyMap<string, readonly Point[]>,
  point: Point | undefined,
  company = false,
): Mention[] {
  const words: { word: string; gap: string }[] = [];
  let end = 0;
  for (const match of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    words.push({ word: nameKey(match[0]), gap: text.slice(end, match.index) });
    end = match.index + match[0].length;
  }
  const keyOf = (start: number, count: number) =>
    words
      .slice(start, start + count)
      .map((entry) => entry.word)
      .join(" ");
  const found: { key: string; start: number; count: number }[] = [];
  for (let start = 0; start < words.length;) {
    let count = Math.min(LONGEST, words.length - start);
    while (count && !towns.has(keyOf(start, count))) count--;
    if (count) {
      found.push({ key: keyOf(start, count), start, count });
      start += count;
    } else start++;
  }
  const several = new Set(found.map((mention) => mention.key)).size > 1;
  return found.map(({ key, start, count }) => {
    const near =
      point !== undefined &&
      (towns.get(key) ?? []).some((town) => distanceKm(point, town) < NEAR_KM);
    const last = start + count === words.length;
    const marked =
      BEFORE.test(words[start]?.gap ?? "") ||
      PLACE_WORDS.has(words[start - 1]?.word ?? "") ||
      REGION_WORDS.has(words[start + count]?.word ?? "") ||
      (start > 0 &&
        (company || last || AFTER.test(words[start + count]?.gap ?? "")));
    return { key, place: near || marked || several };
  });
}

export interface NamedOffer {
  readonly title: string;
  readonly company: string;
  readonly placement: Placement;
}

// The ambiguous town names, in key form, sorted (FR-8).
export function ambiguousNames(
  towns: readonly TownInUse[],
  offers: readonly NamedOffer[],
): string[] {
  const names = townNames(towns);
  const uses = new Map<string, { place: number; word: number }>();
  const use = (key: string) => {
    let entry = uses.get(key);
    if (!entry) {
      entry = { place: 0, word: 0 };
      uses.set(key, entry);
    }
    return entry;
  };
  for (const offer of offers) {
    const town = offer.placement.town;
    const point: Point | undefined = town
      ? [town.latitude, town.longitude]
      : undefined;
    const place = new Set<string>();
    const word = new Set<string>();
    for (const [text, company] of [
      [offer.title, false],
      [offer.company, true],
    ] as const)
      for (const mention of namesIn(text, names, point, company))
        (mention.place ? place : word).add(mention.key);
    for (const key of place) use(key).place++;
    for (const key of word) if (!place.has(key)) use(key).word++;
  }
  return [...uses]
    .filter(([, { place, word }]) => word > WORD_SHARE * (word + place))
    .map(([key]) => key)
    .toSorted();
}
