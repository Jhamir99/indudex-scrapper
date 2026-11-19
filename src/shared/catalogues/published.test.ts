import { describe, expect, it } from "vitest";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { CATALOGUES } from "./catalogues.js";
import {
  CATALOGUE_VERSION,
  PUBLISHED_CATALOGUES,
  publishedCatalogues,
} from "./published.js";

const PUBLISHED = [
  "families",
  "occupations",
  "countries",
  "languages",
  "degrees",
  "seniority",
  "vetoes",
];

describe("published catalogues (FR-6)", () => {
  it("are exactly the seven the web reads", () => {
    expect(PUBLISHED_CATALOGUES).toEqual(PUBLISHED);
  });

  it("are read with their headers", async () => {
    const catalogues = await publishedCatalogues();
    expect(Object.keys(catalogues)).toEqual(PUBLISHED);
    for (const catalogue of Object.values(catalogues))
      expect(catalogue.about.sources.length).toBeGreaterThan(0);
  });

  it("leave titles, activities and every working table inside the processor", () => {
    const internal = Object.entries(CATALOGUES)
      .filter(([, entry]) => entry.file.startsWith("codes/"))
      .map(([name]) => name);
    expect(internal.length).toBeGreaterThan(0);
    expect(
      [...internal, "titles", "activities"].filter((name) =>
        PUBLISHED_CATALOGUES.some((published) => published === name),
      ),
    ).toEqual([]);
  });

  it("carry names for the API's OpenAPI spec", () => {
    const app = new OpenAPIHono();
    for (const name of PUBLISHED_CATALOGUES)
      app.openapi(
        createRoute({
          method: "get",
          path: `/${name}`,
          responses: {
            200: {
              description: name,
              content: {
                "application/json": { schema: CATALOGUES[name].schema },
              },
            },
          },
        }),
        (context) => context.json({} as never),
      );
    const document = app.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "catalogues", version: "1" },
    });
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        "Families",
        "Occupations",
        "Countries",
        "Languages",
        "Degrees",
        "Seniority",
        "Vetoes",
        "CatalogueHeader",
      ]),
    );
  });

  it("start at version 1", () => {
    expect(CATALOGUE_VERSION).toBe(1);
  });
});
