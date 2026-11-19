import { placeOf } from "../../src/shared/catalogues/places.js";
import type { PlaceRow } from "../../src/shared/catalogues/schemas.js";
import { readPlaces } from "../../src/shared/catalogues/places.js";
import { readCatalogue } from "../../src/shared/catalogues/read-catalogue.js";
import {
  compileGazetteer,
  type CountryNames,
  type Gazetteer,
  type NutsTables,
} from "../../src/features/places/gazetteer.js";

// A gazetteer of a few made-up rows, in the catalogue's tuple form, as the legacy's tests built them.
export function smallGazetteer(
  rows: readonly PlaceRow[],
  nuts: NutsTables = {},
  countries: readonly CountryNames[] = [],
): Gazetteer {
  return compileGazetteer(rows.map(placeOf), nuts, countries);
}

let real: Promise<Gazetteer> | undefined;

// The gazetteer of the real catalogues, built once per test file.
export function realGazetteer(): Promise<Gazetteer> {
  real ??= Promise.all([
    readPlaces(),
    readCatalogue("nuts"),
    readCatalogue("countries"),
  ]).then(([places, nuts, { countries }]) =>
    compileGazetteer(places, nuts, countries),
  );
  return real;
}
