import { CATALOGUES, type CatalogueName } from "./catalogues.js";
import { readCatalogue } from "./read-catalogue.js";

// The shape of the published catalogues: goes up when a published schema changes shape, not when
// entries are added (FR-6). Recorded in the published dataset's metadata.
export const CATALOGUE_VERSION = 1;

type PublishedName = {
  [Name in CatalogueName]: (typeof CATALOGUES)[Name]["published"] extends true
    ? Name
    : never;
}[CatalogueName];

export const PUBLISHED_CATALOGUES = (
  Object.keys(CATALOGUES) as CatalogueName[]
).filter((name): name is PublishedName => CATALOGUES[name].published);

// The catalogues the web reads, with their headers, for the publication to copy.
export async function publishedCatalogues(directory?: string) {
  const [families, occupations, countries, languages, degrees, seniority, vetoes] =
    await Promise.all([
      readCatalogue("families", directory),
      readCatalogue("occupations", directory),
      readCatalogue("countries", directory),
      readCatalogue("languages", directory),
      readCatalogue("degrees", directory),
      readCatalogue("seniority", directory),
      readCatalogue("vetoes", directory),
    ]);
  return {
    families,
    occupations,
    countries,
    languages,
    degrees,
    seniority,
    vetoes,
  } satisfies Record<PublishedName, unknown>;
}
