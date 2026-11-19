import type { Place } from "../../shared/catalogues/places.js";
import type { Nuts } from "../../shared/catalogues/schemas.js";
import { fold, nameKeys } from "../../shared/kit/fold.js";
import { areaName, loose } from "./names.js";

export interface Town extends Place {
  // The town's NUTS 3 code; its region and province are the codes it begins with. "" when none.
  readonly nuts: string;
}

// Country → folded name → the towns that go by it, and each country's regions and provinces by
// the names a place may give for them. Built once per run (legacy compileTowns).
export interface Gazetteer {
  readonly towns: ReadonlyMap<string, ReadonlyMap<string, readonly Town[]>>;
  // NUTS's own names, folded.
  readonly areas: ReadonlyMap<string, ReadonlyMap<string, string>>;
  // Other ways sources write them: without the word for a province, the UK's counties, spaces
  // for hyphens. Only for a place that names no town, or as the area a town must lie in.
  readonly looseAreas: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

export type NutsTables = Partial<Pick<Nuts, "areas" | "otherNames" | "towns">>;

// The letters fold leaves, which sources write without them or spelt out: «Baerum»,
// «Lillestrom» and «Lillestroem», «Aalesund», «Muenchen» (NOB-17).
const SPELT = /[øæœßłđðþıħäöüå]/i;

function mapOf<Value>(
  outer: Map<string, Map<string, Value>>,
  key: string,
): Map<string, Value> {
  let inner = outer.get(key);
  if (!inner) {
    inner = new Map();
    outer.set(key, inner);
  }
  return inner;
}

function compileAreas(nuts: NutsTables) {
  const areas = new Map<string, Map<string, string>>();
  const looseAreas = new Map<string, Map<string, string>>();
  for (const [country, names] of Object.entries(nuts.areas ?? {})) {
    areas.set(country, new Map(Object.entries(names)));
    // Without the word for a province and a country's code in brackets: «prov.
    // west-vlaanderen» is VDAB's «Provincie West-Vlaanderen», «osjecko-baranjska zupanija»
    // HZZ's «Osječko-baranjska». As the area a town must lie in, a province a source got wrong
    // («Waregem, Oost-Vlaanderen» is West-Vlaanderen's) put 423 published offers off the map
    // (7 November 2026), hence apart from NUTS's own names.
    const bareNames = mapOf(looseAreas, country);
    for (const [name, code] of Object.entries(names)) {
      const bare = fold(areaName(name)).replace(/\s*\([a-z]{2}\)$/, "");
      if (bare && !(bare in names)) bareNames.set(bare, code);
    }
  }
  // The other names sources give for areas, the UK's counties among them.
  for (const [country, names] of Object.entries(nuts.otherNames ?? {})) {
    const more = mapOf(looseAreas, country);
    for (const [name, code] of Object.entries(names))
      if (!more.has(name)) more.set(name, code);
  }
  // And each with spaces for its hyphens («Zuid Holland», «Ile de France»).
  for (const [country, names] of areas) {
    const more = mapOf(looseAreas, country);
    for (const [name, code] of [...names, ...more]) {
      const spaced = loose(name);
      if (spaced !== name && !names.has(spaced) && !more.has(spaced))
        more.set(spaced, code);
    }
  }
  return { areas, looseAreas };
}

export function compileGazetteer(
  places: readonly Place[],
  nuts: NutsTables = {},
): Gazetteer {
  const towns = new Map<string, Map<string, Town[]>>();
  const spelt = new Map<Map<string, Town[]>, [string, Town][]>();
  for (const place of places) {
    const town: Town = { ...place, nuts: nuts.towns?.[place.geonameId] ?? "" };
    const byName = mapOf(towns, town.country);
    const names = [town.name, ...town.otherNames];
    let pairs = spelt.get(byName);
    if (!pairs) {
      pairs = [];
      spelt.set(byName, pairs);
    }
    for (const name of names)
      if (SPELT.test(name))
        for (const key of nameKeys(name)) pairs.push([key, town]);
    // A name of several words also loosely; one word loosely («Val'») would be a name of no
    // town («Val» of Val-d'Oise).
    const keys = new Set(
      names.flatMap((name) => {
        const spaced = loose(name);
        return spaced.includes(" ") ? [fold(name), spaced] : [fold(name)];
      }),
    );
    for (const key of keys) {
      const list = byName.get(key);
      if (list) list.push(town);
      else byName.set(key, [town]);
    }
  }
  // The spelt-out forms are added after every town's own names, so a town that goes by that
  // name itself keeps it («Moers» is not «Mörs»).
  for (const [byName, pairs] of spelt) {
    const made = new Set<string>();
    for (const [key, town] of pairs) {
      const list = byName.get(key);
      if (list && !made.has(key)) continue;
      if (!list) {
        byName.set(key, [town]);
        made.add(key);
      } else if (!list.includes(town)) list.push(town);
    }
  }
  return { towns, ...compileAreas(nuts) };
}
