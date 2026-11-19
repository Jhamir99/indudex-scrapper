import type { z } from "@hono/zod-openapi";

export interface CatalogueEntry<Schema extends z.ZodType = z.ZodType> {
  // Relative to the catalogues folder ("families.json", "codes/places.json").
  readonly file: string;
  readonly schema: Schema;
  // Published catalogues are the ones the web reads; the others never leave the processor (FR-6).
  readonly published: boolean;
}

// Every catalogue the processor's steps may read, by name.
export const CATALOGUES = {} satisfies Record<string, CatalogueEntry>;

export type CatalogueName = keyof typeof CATALOGUES;
