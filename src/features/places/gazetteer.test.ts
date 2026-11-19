import { describe, expect, it } from "vitest";
import {
  realGazetteer,
  smallGazetteer,
} from "../../../test/places/gazetteer.js";
import type { Gazetteer } from "./gazetteer.js";

const ids = (gazetteer: Gazetteer, country: string, key: string) =>
  (gazetteer.towns.get(country)?.get(key) ?? []).map((town) => town.geonameId);

describe("the gazetteer (FR-2)", () => {
  const nordic = smallGazetteer([
    [42, "Bærum", "no", "Viken", 59.9, 10.5, 127731, []],
    [43, "Lillestrøm", "no", "Viken", 59.96, 11.05, 85000, []],
    [44, "Ålesund", "no", "Møre og Romsdal", 62.47, 6.15, 67000, []],
    [45, "Mörs", "de", "North Rhine-Westphalia", 51.45, 6.62, 100, []],
    [46, "Moers", "de", "North Rhine-Westphalia", 51.45, 6.63, 104000, []],
    [47, "Aix-en-Provence", "fr", "Provence", 43.53, 5.45, 143000, []],
  ]);

  it("holds a town by each of its names, folded, per country", () => {
    expect(ids(nordic, "no", "bærum")).toEqual([42]);
    expect(ids(nordic, "fr", "aix-en-provence")).toEqual([47]);
    expect(ids(nordic, "no", "aix-en-provence")).toEqual([]);
  });

  it("holds a name of several words without its hyphens too, but not one word", () => {
    expect(ids(nordic, "fr", "aix en provence")).toEqual([47]);
  });

  it("holds the Nordic and German letters written without them or spelt out (NOB-17)", () => {
    expect(ids(nordic, "no", "baerum")).toEqual([42]);
    expect(ids(nordic, "no", "lillestrom")).toEqual([43]);
    expect(ids(nordic, "no", "lillestroem")).toEqual([43]);
    expect(ids(nordic, "no", "aalesund")).toEqual([44]);
  });

  it("leaves a name to the town that goes by it itself", () => {
    expect(ids(nordic, "de", "moers")).toEqual([46]);
  });

  it("gives each town its NUTS 3 code", () => {
    const leipzig = smallGazetteer(
      [[8, "Leipzig", "de", "Saxony", 51.34, 12.37, 504971, []]],
      { towns: { "8": "DED51" } },
    );
    expect(leipzig.towns.get("de")?.get("leipzig")?.[0]?.nuts).toBe("DED51");
  });

  it("holds areas by NUTS's names, and loosely without a province's word or hyphens", () => {
    const flanders = smallGazetteer([], {
      areas: {
        be: { "provincie west-vlaanderen": "BE25", "west-vlaanderen": "BE25" },
        nl: { "zuid-holland": "NL33" },
      },
      otherNames: { be: { waasland: "BE236" } },
    });
    expect(flanders.areas.get("nl")?.get("zuid-holland")).toBe("NL33");
    expect(flanders.looseAreas.get("nl")?.get("zuid holland")).toBe("NL33");
    expect(flanders.looseAreas.get("be")?.get("waasland")).toBe("BE236");
    expect(flanders.looseAreas.get("be")?.get("west vlaanderen")).toBe("BE25");
  });
});

describe("the gazetteer of the real catalogues (FR-2)", () => {
  it.each([
    ["fr", "aix en provence", "Aix-en-Provence"],
    ["nl", "s hertogenbosch", "'s-Hertogenbosch"],
    ["ch", "st gallen", "Sankt Gallen"],
    ["no", "baerum", "Bærum"],
    ["no", "lillestroem", "Lillestrøm"],
    ["de", "muenchen", "Munich"],
  ])("finds %s «%s» as %s", async (country, key, name) => {
    const gazetteer = await realGazetteer();
    expect(
      gazetteer.towns
        .get(country)
        ?.get(key)
        ?.map((town) => town.name),
    ).toContain(name);
  });

  it("finds Dutch and Belgian areas written loosely", async () => {
    const gazetteer = await realGazetteer();
    expect(gazetteer.looseAreas.get("nl")?.get("zuid holland")).toMatch(
      /^NL36/,
    );
    expect(gazetteer.looseAreas.get("be")?.get("west-vlaanderen")).toMatch(
      /^BE25/,
    );
  });
});
