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

let names: Promise<CountryNames> | undefined;
export function countryNames(): Promise<CountryNames> {
  names ??= readCatalogue("countries").then(({ countries }) => ({
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
  return names;
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
