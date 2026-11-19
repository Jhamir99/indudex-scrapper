import { fold } from "../../shared/kit/fold.js";
import type { Gazetteer, NutsTables, Town } from "./gazetteer.js";
import type { Placement } from "./place-advert.js";

// A town that holds offers, for the search bar and the map (FR-8).
export interface TownInUse {
  readonly geonameId: number;
  // The name its offers use most ("Göteborg" more than "Gothenburg").
  readonly name: string;
  // GeoNames' name when it differs, else "".
  readonly geonamesName: string;
  readonly region: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly offers: number;
  // Its names in the languages visitors write in ("Londres", "Gotemburgo", "Genf").
  readonly otherNames: readonly string[];
}

const round = (degrees: number) => Math.round(degrees * 100) / 100;

// A town's names in the languages visitors write in, for the search bar: four letters at least,
// three words at most.
function visitorNames(town: Town, taken: ReadonlySet<string>): string[] {
  return [
    ...new Set(
      town.localNames.filter(
        (name) =>
          name.length >= 4 &&
          name.split(/\s+/).length <= 3 &&
          /^[\p{L}' .-]+$/u.test(name) &&
          !taken.has(fold(name)),
      ),
    ),
  ];
}

// The towns with offers, the fullest first (ties by GeoNames id, so the list is stable).
export function townsInUse(
  gazetteer: Gazetteer,
  placements: readonly Placement[],
): TownInUse[] {
  const tally = new Map<
    number,
    { offers: number; names: Map<string, number> }
  >();
  for (const { town } of placements) {
    if (!town) continue;
    let entry = tally.get(town.geonameId);
    if (!entry) {
      entry = { offers: 0, names: new Map() };
      tally.set(town.geonameId, entry);
    }
    entry.offers++;
    entry.names.set(town.name, (entry.names.get(town.name) ?? 0) + 1);
  }
  const out: TownInUse[] = [];
  for (const [geonameId, { offers, names }] of tally) {
    const town = gazetteer.byId.get(geonameId);
    if (!town) continue;
    const name =
      [...names].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? town.name;
    out.push({
      geonameId,
      name,
      geonamesName: fold(name) === fold(town.name) ? "" : town.name,
      region: town.region,
      country: town.country,
      latitude: round(town.latitude),
      longitude: round(town.longitude),
      offers,
      otherNames: visitorNames(town, new Set([fold(name), fold(town.name)])),
    });
  }
  return out.toSorted(
    (a, b) => b.offers - a.offers || a.geonameId - b.geonameId,
  );
}

// A region or province that holds offers: its names (the Latin one, then its own when it
// differs), the other names people search it by ("catalunya", "bavaria"), and its offers.
export interface AreaInUse {
  readonly names: readonly string[];
  readonly otherNames: readonly string[];
  readonly offers: number;
}

export interface RegionsInUse {
  // Country → NUTS code → the area.
  readonly regions: Readonly<
    Record<string, Readonly<Record<string, AreaInUse>>>
  >;
  readonly provinces: Readonly<
    Record<string, Readonly<Record<string, AreaInUse>>>
  >;
}

// Each country's regions and provinces that hold offers: an offer's region or province is the one
// its NUTS code begins with.
export function regionsInUse(
  nuts: NutsTables,
  placed: readonly { readonly country: string; readonly nuts: string | null }[],
): RegionsInUse {
  const otherNamesOf = (
    country: string,
    code: string,
    names: readonly string[],
  ) =>
    Object.entries(nuts.areas?.[country] ?? {})
      .filter(
        ([name, of]) => of === code && !names.some((own) => fold(own) === name),
      )
      .map(([name]) => name);
  const count = (tables: NutsTables["regions"]) => {
    const out: Record<string, Record<string, AreaInUse>> = {};
    for (const { country, nuts: code } of placed) {
      if (!code) continue;
      const all = tables?.[country] ?? {};
      const area = Object.keys(all).find((candidate) =>
        code.startsWith(candidate),
      );
      if (!area) continue;
      const shelf = (out[country] ??= {});
      const names = all[area] ?? [];
      const was = shelf[area];
      shelf[area] = {
        names,
        otherNames: was?.otherNames ?? otherNamesOf(country, area, names),
        offers: (was?.offers ?? 0) + 1,
      };
    }
    return out;
  };
  return { regions: count(nuts.regions), provinces: count(nuts.provinces) };
}
