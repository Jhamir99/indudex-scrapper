import { fold } from "../kit/fold.js";
import { readCatalogue } from "./read-catalogue.js";

// A country as a source writes it, to its ISO code, through the countries catalogue: its name and other names, and
// (where a source writes only a town) the big cities the catalogue lists. Read by the sources that give no code: the
// partner programmes' feeds (014) and the remote boards (015). Moved here from credentialed sources on 2026-11-26, when
// a second feature needed it.
export interface CountryNames {
  readonly byName: ReadonlyMap<string, string>;
  readonly byCity: ReadonlyMap<string, string>;
}

let loaded: Promise<CountryNames> | undefined;
export function countryNames(): Promise<CountryNames> {
  loaded ??= readCatalogue("countries").then(({ countries }) => ({
    byName: new Map(
      countries.flatMap((country) =>
        [country.name, ...country.aliases].map(
          (name) => [fold(name), country.iso] as const,
        ),
      ),
    ),
    byCity: new Map(
      countries.flatMap((country) =>
        country.cities.map((city) => [fold(city), country.iso] as const),
      ),
    ),
  }));
  return loaded;
}

// A country's name, or the two letters a source gives: a name first, since a source may write "UK" (the catalogue's
// name of Great Britain, gb) where it means a country, not its code.
export function countryCode(
  written: string,
  byName: ReadonlyMap<string, string>,
): string | undefined {
  const named = byName.get(fold(written.trim()));
  if (named) return named;
  return /^[A-Za-z]{2}$/.test(written.trim())
    ? written.trim().toLowerCase()
    : undefined;
}

// The first part of a place that names a country ("Spain, Portugal": Spain; "City of London, London, UK": gb), or
// (`townsToo`) a big town of one.
export function countryOfPlace(
  place: string,
  names: CountryNames,
  townsToo = false,
): string | undefined {
  for (const part of place.split(/[,;/|]| - | or | and /)) {
    const code = countryCode(part, names.byName);
    if (code) return code;
    if (townsToo) {
      const town = names.byCity.get(fold(part.trim()));
      if (town) return town;
    }
  }
  return undefined;
}

