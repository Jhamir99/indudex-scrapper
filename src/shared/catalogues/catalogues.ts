import type { z } from "@hono/zod-openapi";
import {
  Activities,
  ConfirmedTitles,
  IscoTable,
  NationalTitles,
  SsykIsco,
  WikidataCountries,
  Countries,
  Degrees,
  Families,
  Languages,
  Occupations,
  Seniority,
  Vetoes,
} from "./schemas.js";

export interface CatalogueEntry<Schema extends z.ZodType = z.ZodType> {
  // Relative to the catalogues folder ("families.json", "codes/places.json").
  readonly file: string;
  readonly schema: Schema;
  // Published catalogues are the ones the web reads; the others never leave the processor (FR-6).
  readonly published: boolean;
}

// Every catalogue the processor's steps may read, by name.
export const CATALOGUES = {
  families: { file: "families.json", schema: Families, published: true },
  occupations: {
    file: "occupations.json",
    schema: Occupations,
    published: true,
  },
  countries: { file: "countries.json", schema: Countries, published: true },
  languages: { file: "languages.json", schema: Languages, published: true },
  degrees: { file: "degrees.json", schema: Degrees, published: true },
  seniority: { file: "seniority.json", schema: Seniority, published: true },
  vetoes: { file: "vetoes.json", schema: Vetoes, published: true },
  activities: {
    file: "activities.json",
    schema: Activities,
    published: false,
  },
  isco: { file: "codes/isco.json", schema: IscoTable, published: false },
  ssykIsco: {
    file: "codes/ssyk-isco.json",
    schema: SsykIsco,
    published: false,
  },
  // Two of its sources allow occupational use only: never published.
  titles: {
    file: "codes/titles.json",
    schema: NationalTitles,
    published: false,
  },
  confirmedTitles: {
    file: "codes/confirmed-titles.json",
    schema: ConfirmedTitles,
    published: false,
  },
  wikidataCountries: {
    file: "codes/wikidata-countries.json",
    schema: WikidataCountries,
    published: false,
  },
} as const satisfies Record<string, CatalogueEntry>;

export type CatalogueName = keyof typeof CATALOGUES;
