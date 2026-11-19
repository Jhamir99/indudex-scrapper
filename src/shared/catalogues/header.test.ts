import { describe, expect, it } from "vitest";
import { z } from "@hono/zod-openapi";
import { CatalogueHeader, catalogueFile } from "./header.js";

const header = {
  description: "GeoNames' populated places of more than 1,000 people.",
  sources: [
    {
      name: "GeoNames",
      url: "https://download.geonames.org/export/dump/",
      licence: "CC BY 4.0",
    },
  ],
  builtAt: "2026-11-08",
  builtBy: "legacy builder/tools/places.mjs",
  importedFrom: "JustJans/indudex@b0cd182",
};

describe("CatalogueHeader (FR-2)", () => {
  it("accepts a header that names its sources and their licences", () => {
    expect(CatalogueHeader.parse(header)).toEqual(header);
  });

  it("refuses a header with no source", () => {
    expect(
      CatalogueHeader.safeParse({ ...header, sources: [] }).success,
    ).toBe(false);
  });

  it("refuses a source with no licence", () => {
    const { licence: _licence, ...source } = header.sources[0]!;
    expect(
      CatalogueHeader.safeParse({ ...header, sources: [source] }).success,
    ).toBe(false);
  });

  it("puts the header in front of a file's own keys", () => {
    const File = catalogueFile({ levels: z.array(z.string()) });
    expect(File.parse({ about: header, levels: ["junior"] })).toEqual({
      about: header,
      levels: ["junior"],
    });
    expect(File.safeParse({ levels: ["junior"] }).success).toBe(false);
  });
});
