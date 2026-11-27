// The legacy's builder/towns.ts readers that its place reader asks (JustJans/indudex@ec79858), copied (career sites
// T008): the country of a place that names its town and no country (`countryOfTown`), or a region or a province only
// one of our countries has (`countryOfArea`), and a town's article put back (`withArticle`). Only their imports changed:
// a place's pieces and names are places' copies (pieces.ts, names.ts), and the map is our gazetteer (`Everywhere`, built
// by place-advert.ts), which also answers the questions false-town.ts asks. Their own comments keep their marks.
import { fold } from "../../../shared/kit/fold.js";
import type { Everywhere as FalseTownMap } from "../false-town.js";
import { areaName, loose } from "../names.js";
import { pieces, withArticle as articleBack, withTown } from "../pieces.js";

// A town of the map as the legacy's readers read it: its name, country, GeoNames' region and people.
export type Town = {
  readonly name: string;
  readonly cc: string;
  readonly region: string;
  readonly pop: number;
};
type ByName = ReadonlyMap<string, readonly Town[]>;
type AreaNames = ReadonlyMap<string, ReadonlyMap<string, string>>;
export type Everywhere = {
  readonly byName: ByName;
  readonly elsewhere: Readonly<Record<string, readonly [string, number]>>;
  readonly areas?: AreaNames;
  readonly looseAreas?: AreaNames;
} & FalseTownMap;

export const withArticle = (l: unknown, byName: ByName | undefined): string =>
  articleBack(String(l || ""), (name) => Boolean(byName?.has(name)));

// ➤ The country of a place that names its town and no country ("Heverlee", "Oberkochen"), the
// ➤ way geocoders rank the towns of one name, by population: ours when the biggest town of that
// ➤ name, the world over, is ours and more than five times any other country's ("Washington" and
// ➤ "Edmonton" are not in Britain; "Baden" is Austria's as much as Switzerland's: none). A town
// ➤ by its own name comes before one by its name in another language ("Augusta" is Augusta, not
// ➤ Augsburg in Italian). A code in capitals ("BRA", "HQ") is not a town. `allowed`, when
// ➤ given, are the only countries it may be in. Answers { cc, said } or null.
const OUTWEIGHS = 5;
export function countryOfTown(
  location: unknown,
  { byName, elsewhere }: Everywhere,
  allowed: Set<string> | null = null,
): { cc: string; said: string } | null {
  const may = (cc: string): boolean => !allowed || allowed.has(cc);
  for (const said of pieces(String(location || "")).flatMap(withTown)) {
    const k = fold(said);
    const named =
      said.length >= 3 && !/^[A-Z]{2,4}$/.test(said)
        ? (byName.get(k) || []).filter((t) => may(t.cc))
        : [];
    if (!named.length) continue;
    const own = named.filter((t) => fold(t.name) === k);
    const found = own.length ? own : named;
    const far = elsewhere[k];
    const biggest = new Map<string, number>(
      far && may(far[0]) ? [[far[0], far[1]]] : [],
    );
    for (const t of found)
      biggest.set(t.cc, Math.max(biggest.get(t.cc) || 0, t.pop));
    const [first, second] = [...biggest].sort((a, b) => b[1] - a[1]);
    if (!first) return null;
    const ours = found.some((t) => t.cc === first[0]);
    return ours && (!second || first[1] > OUTWEIGHS * second[1])
      ? { cc: first[0], said }
      : null;
  }
  return null;
}

// ➤ The country of a place that names no town and no country but a region or a province that only one of our
// ➤ countries has («Oberösterreich», «Ostschweiz», «Normandie», «Gironde (33)»: some 200 published offers had no
// ➤ country, 8 November 2026). Answers { cc } or null; none for a name two countries' areas share («Limburg»).
// ➤ Only among `allowed`, the countries the advert's language, site or marks suggest, and only where every other piece
// ➤ is a town of ours in that country: an area's name is often a place's elsewhere too («Kalispell, Montana» is no
// ➤ Bulgarian province, «Kent, Washington» no English county, «Guanajuato, León» no Spanish one; 285, 117 and 14 stored
// ➤ adverts in a first try).
export function countryOfArea(
  location: unknown,
  { areas, byName }: Everywhere,
  allowed: Set<string> | null | undefined,
): { cc: string } | null {
  if (!areas || !allowed?.size) return null;
  const found = new Set<string>(),
    towns: (readonly Town[])[] = [];
  for (const piece of pieces(String(location || ""))) {
    const names = [fold(piece), loose(piece), fold(areaName(piece))];
    const of = [...areas]
      .filter(
        ([cc, list]) => allowed.has(cc) && names.some((n) => n && list.has(n)),
      )
      .map(([cc]) => cc);
    if (of.length) {
      for (const cc of of) found.add(cc);
      continue;
    }
    const known = byName.get(fold(piece)) || [];
    if (!known.length) return null;
    towns.push(known);
  }
  if (found.size !== 1) return null;
  const cc = [...found][0]!;
  return towns.every((known) => known.some((t) => t.cc === cc)) ? { cc } : null;
}
