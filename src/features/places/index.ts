import type { Place } from "../../shared/catalogues/places.js";
import {
  compileGazetteer,
  type CountryNames,
  type NutsTables,
} from "./gazetteer.js";
import {
  atMost,
  FIELD_LIMITS,
  namedTown,
  placeAdvert,
  type PlaceInput,
  type Placement,
} from "./place-advert.js";

import { ambiguousNames, type NamedOffer } from "./ambiguous-names.js";
import { regionsInUse, townsInUse, type TownInUse } from "./in-use.js";

export { Placement, type PlaceInput } from "./place-advert.js";
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
  readonly countries: readonly CountryNames[];
}

// Places' public entry for the processor: the gazetteer is compiled once, then each advert is
// placed from its own fields alone (FR-9).
export function createPlacer(catalogues: PlaceCatalogues) {
  const gazetteer = compileGazetteer(
    catalogues.places,
    catalogues.nuts,
    catalogues.countries,
  );
  return {
    place: (input: PlaceInput): Placement => placeAdvert(gazetteer, input),
    // The town the place names, known or not ("" when it names only its country): what an offer
    // shows when no town of the gazetteer was found.
    townNamed: (input: Pick<PlaceInput, "country" | "location" | "city">) =>
      namedTown(gazetteer, {
        country: input.country,
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
