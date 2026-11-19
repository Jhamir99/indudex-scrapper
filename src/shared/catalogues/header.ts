import { z } from "@hono/zod-openapi";

// A source a catalogue was built from, with its licence or terms as the source states them (FR-2).
export const CatalogueSource = z
  .strictObject({
    name: z.string().min(1),
    url: z.url({ protocol: /^https?$/ }),
    licence: z.string().min(1),
  })
  .openapi("CatalogueSource");
export type CatalogueSource = z.infer<typeof CatalogueSource>;

// The header every catalogue file carries as its `about` key.
export const CatalogueHeader = z
  .strictObject({
    // What the file holds and its rules ("APPEND ONLY"), as the legacy wrote them.
    description: z.string().min(1),
    sources: z.array(CatalogueSource).min(1),
    builtAt: z.iso.date(),
    // The tool that built it ("legacy builder/tools/places.mjs", "by hand").
    builtBy: z.string().min(1),
    // Where this copy came from ("JustJans/indudex@b0cd182").
    importedFrom: z.string().min(1),
  })
  .openapi("CatalogueHeader");
export type CatalogueHeader = z.infer<typeof CatalogueHeader>;

// A catalogue file: its header, then its own keys.
export function catalogueFile<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.strictObject({ about: CatalogueHeader, ...shape });
}
