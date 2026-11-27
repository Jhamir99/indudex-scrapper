import { fold, nameKeys } from "../../shared/kit/fold.js";
import type { CountryNames, Gazetteer } from "./gazetteer.js";
import {
  compileCountries,
  placeOfAdvert,
  type RawOffer,
} from "./legacy/place-of-advert.js";
import type { Everywhere, Town } from "./legacy/towns.js";

// The country an advert's place, title and address name, the world over, as the legacy's processor read it (its
// `placeOfAdvert`, copied in legacy/place-of-advert.ts): for the sources that state no country, the employers' sites and
// the boards (career sites FR-10). "" when nothing can be read.

export type CountryInput = RawOffer;
export interface CountryRead {
  readonly country: string;
  readonly town: string;
}

// The countries catalogue's entries as the legacy compiled them: with their big towns.
export interface CountryEntry extends CountryNames {
  readonly cities?: readonly string[];
}

const SPELT = /[øæœßłđðþıħäöüå]/i;

// The legacy's `townsEverywhere`: our towns by their own names and those known in visitors' languages, whatever their
// country (GeoNames' other names are mostly transliterations, and some are words), the spelt-out forms after them; with
// the biggest town elsewhere in the world of each name.
function legacyMap(
  gazetteer: Gazetteer,
  falseTowns: Pick<Everywhere, "knows" | "countryOf">,
  elsewhere: Everywhere["elsewhere"],
): Everywhere {
  const byName = new Map<string, Town[]>();
  const respelt: [string, Town][] = [];
  for (const place of gazetteer.byId.values()) {
    const town: Town = {
      name: place.name,
      cc: place.country,
      region: place.region,
      pop: place.population,
    };
    const names = [place.name, ...place.localNames];
    for (const key of new Set(names.map((name) => fold(name)))) {
      const list = byName.get(key);
      if (list) list.push(town);
      else byName.set(key, [town]);
    }
    for (const name of names)
      if (SPELT.test(name))
        for (const key of nameKeys(name)) respelt.push([key, town]);
  }
  const made = new Set<string>();
  for (const [key, town] of respelt) {
    const list = byName.get(key);
    if (list && !made.has(key)) continue;
    if (!list) {
      byName.set(key, [town]);
      made.add(key);
    } else if (!list.includes(town)) list.push(town);
  }
  return {
    byName,
    elsewhere,
    areas: gazetteer.areas,
    looseAreas: gazetteer.looseAreas,
    ...falseTowns,
  };
}

export function countryReader(
  gazetteer: Gazetteer,
  falseTowns: Pick<Everywhere, "knows" | "countryOf">,
  countries: readonly CountryEntry[],
  elsewhere: Everywhere["elsewhere"],
): (advert: CountryInput) => CountryRead {
  const map = legacyMap(gazetteer, falseTowns, elsewhere);
  const compiled = compileCountries(
    countries.map((country) => ({
      iso: country.iso,
      name: country.name,
      aliases: [...country.aliases],
      cities: [...(country.cities ?? [])],
    })),
  );
  return (advert) => {
    const read = placeOfAdvert(advert, compiled, map);
    return { country: read.cc, town: read.city };
  };
}
