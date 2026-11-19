import type { Place } from "../../shared/catalogues/places.js";
import {
  compileGazetteer,
  type CountryNames,
  type NutsTables,
} from "./gazetteer.js";
import {
  placeAdvert,
  type PlaceInput,
  type Placement,
} from "./place-advert.js";

export { Placement, type PlaceInput } from "./place-advert.js";

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
  };
}
