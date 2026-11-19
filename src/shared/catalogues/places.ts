import type { PlaceRow } from "./schemas.js";
import { readCatalogue } from "./read-catalogue.js";

export interface Place {
  readonly geonameId: number;
  readonly name: string;
  readonly country: string;
  // GeoNames' first-level division; empty when it gives none.
  readonly region: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly population: number;
  readonly otherNames: readonly string[];
  // The names it has in the languages visitors write in.
  readonly localNames: readonly string[];
}

export function placeOf(row: PlaceRow): Place {
  const [
    geonameId,
    name,
    country,
    region,
    latitude,
    longitude,
    population,
    otherNames,
    localNames = [],
  ] = row;
  return {
    geonameId,
    name,
    country,
    region,
    latitude,
    longitude,
    population,
    otherNames,
    localNames,
  };
}

const placesByDirectory = new Map<string, Promise<Place[]>>();

// GeoNames' towns as named fields; the file's tuples stay inside this module.
export function readPlaces(directory?: string): Promise<Place[]> {
  const key = directory ?? "";
  let places = placesByDirectory.get(key);
  if (!places) {
    places = readCatalogue("places", directory).then((catalogue) =>
      catalogue.places.map(placeOf),
    );
    placesByDirectory.set(key, places);
    places.catch(() => placesByDirectory.delete(key));
  }
  return places;
}
