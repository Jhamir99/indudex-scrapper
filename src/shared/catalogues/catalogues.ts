import type { z } from "@hono/zod-openapi";
import {
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
} as const satisfies Record<string, CatalogueEntry>;

export type CatalogueName = keyof typeof CATALOGUES;
