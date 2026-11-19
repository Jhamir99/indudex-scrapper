import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUES } from "./catalogues.js";
import { CATALOGUE_DIRECTORY, readCatalogue } from "./read-catalogue.js";

const raw = async (file: string) =>
  JSON.parse(await readFile(join(CATALOGUE_DIRECTORY, file), "utf8")) as {
    [key: string]: unknown;
  };

describe("the positional catalogues (FR-1, FR-3, FR-5)", () => {
  it("hold the legacy's entries", async () => {
    const families = await readCatalogue("families");
    expect(families.groups).toHaveLength(9);
    expect(families.families).toHaveLength(71);
    expect((await readCatalogue("occupations")).occupations).toHaveLength(644);
    expect((await readCatalogue("countries")).countries).toHaveLength(45);
    expect((await readCatalogue("languages")).languages).toHaveLength(17);
    expect((await readCatalogue("degrees")).degrees).toHaveLength(19);
    expect((await readCatalogue("seniority")).levels).toHaveLength(4);
    expect((await readCatalogue("vetoes")).vetoes).toHaveLength(10);
  });

  it("name every family and occupation in English, Spanish, French, German and Polish", async () => {
    const families = await readCatalogue("families");
    for (const entry of [
      ...families.groups,
      ...families.families,
      ...(await readCatalogue("occupations")).occupations,
    ]) {
      expect(entry.label).not.toBe("");
      expect(entry.es && entry.fr && entry.de && entry.pl).toBeTruthy();
    }
  });

  it("refuses a family in a group that does not exist", async () => {
    const families = await raw("families.json");
    const [first, ...rest] = families["families"] as { group: string }[];
    const result = CATALOGUES.families.schema.safeParse({
      ...families,
      families: [{ ...first, group: "pilots" }, ...rest],
    });
    expect(result.error?.issues[0]?.path).toEqual(["families", 0, "group"]);
  });

  it("refuses an id that appears twice in a positional list", async () => {
    const countries = await raw("countries.json");
    const list = countries["countries"] as unknown[];
    const result = CATALOGUES.countries.schema.safeParse({
      ...countries,
      countries: [...list, list[0]],
    });
    expect(result.error?.issues[0]?.message).toBe('"es" appears twice');
  });

  it.each(Object.entries(CATALOGUES))(
    "refuses a damaged copy of %s, naming the place",
    async (_name, { file, schema }) => {
      const catalogue = await raw(file);
      const result = schema.safeParse({ ...catalogue, misspelt: true });
      expect(result.success).toBe(false);
      const { about: _about, ...withoutHeader } = catalogue;
      expect(schema.safeParse(withoutHeader).error?.issues[0]?.path).toEqual([
        "about",
      ]);
    },
  );
});
