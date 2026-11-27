import type { Place } from "../../shared/catalogues/places.js";
import {
  compileGazetteer,
  type CountryNames,
  type NutsTables,
} from "./gazetteer.js";
import {
  atMost,
  falseTownMap,
  FIELD_LIMITS,
  namedPlace,
  type NamedInput,
  placeAdvert,
  type PlaceInput,
  type Placement,
} from "./place-advert.js";

import { ambiguousNames, type NamedOffer } from "./ambiguous-names.js";
import {
  type CountryEntry,
  type CountryInput,
  type CountryRead,
  countryReader,
} from "./country-of-advert.js";
import { regionsInUse, townsInUse, type TownInUse } from "./in-use.js";

export { Placement, type PlaceInput } from "./place-advert.js";
export type { CountryInput, CountryRead } from "./country-of-advert.js";
// Whether a text places staff with a client (an agency's advert, whatever its name: companies' share).
export { FOR_A_CLIENT } from "./text-towns.js";
export type { AreaInUse, RegionsInUse, TownInUse } from "./in-use.js";
export type { NamedOffer } from "./ambiguous-names.js";

export interface PlaceCatalogues {
  // From readPlaces.
  readonly places: readonly Place[];
  // The `nuts` catalogue.
  readonly nuts: NutsTables;
  // The `countries` catalogue's list.
  readonly countries: readonly (CountryNames & CountryEntry)[];
  // The `elsewhere` catalogue: the biggest town outside our countries of each name our towns go by.
  readonly elsewhere?: Readonly<Record<string, readonly [string, number]>>;
}

// Places' public entry for the processor: the gazetteer is compiled once, then each advert is
// placed from its own fields alone (FR-9).
export function createPlacer(catalogues: PlaceCatalogues) {
  const gazetteer = compileGazetteer(
    catalogues.places,
    catalogues.nuts,
    catalogues.countries,
  );
  let countryOf: ((advert: CountryInput) => CountryRead) | undefined;
  return {
    place: (input: PlaceInput): Placement => placeAdvert(gazetteer, input),
    // The country an advert's place, title and address name, the world over, as the legacy's processor read it, and
    // its town ("" when nothing can be read): for the sources that state no country (career sites FR-10).
    countryOf: (advert: CountryInput): CountryRead =>
      (countryOf ??= countryReader(
        gazetteer,
        falseTownMap(gazetteer),
        catalogues.countries,
        catalogues.elsewhere ?? {},
      ))(advert),
    // The town the place names, known or not ("" when it names only its country): what an offer shows when no town of
    // the gazetteer was found; and the country it names, another European one when the town is that country's name.
    namedPlace: (input: NamedInput) =>
      namedPlace(gazetteer, {
        ...input,
        location: atMost(input.location, FIELD_LIMITS.location),
        city: atMost(input.city, FIELD_LIMITS.city),
      }),
    // The towns that hold offers, from the placements of every published offer.
    townsInUse: (placements: readonly Placement[]) =>
      townsInUse(gazetteer, placements),
    // The regions and provinces that hold offers.
    regionsInUse: (
      placed: readonly {
        readonly country: string;
        readonly nuts: string | null;
      }[],
      also: readonly {
        readonly country: string;
        readonly nuts: string | null;
      }[] = [],
    ) => regionsInUse(catalogues.nuts, placed, also),
    // The town names the search bar must not take for a town unless marked as one.
    ambiguousNames: (
      towns: readonly TownInUse[],
      offers: readonly NamedOffer[],
    ) => ambiguousNames(towns, offers),
  };
}
