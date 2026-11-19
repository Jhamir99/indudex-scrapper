import { describe, expect, it } from "vitest";
import { smallGazetteer } from "../../../test/places/gazetteer.js";
import { regionsInUse, townsInUse } from "./in-use.js";
import type { Placement } from "./place-advert.js";

const gazetteer = smallGazetteer([
  [
    1,
    "Munich",
    "de",
    "Bavaria",
    48.1374,
    11.5755,
    1505005,
    ["München"],
    ["Múnich", "Monaco di Baviera", "Mn"],
  ],
  [
    2,
    "Göteborg",
    "se",
    "Västra Götaland",
    57.7072,
    11.9668,
    572799,
    ["Gothenburg"],
    ["Gotemburgo"],
  ],
]);

const at = (geonameId: number, name: string): Placement => ({
  town: { geonameId, name, latitude: 0, longitude: 0 },
  nuts: null,
  from: "location",
});

describe("towns in use (FR-8)", () => {
  it("lists each town under the name its offers use most, the fullest first", () => {
    expect(
      townsInUse(gazetteer, [
        at(2, "Göteborg"),
        at(1, "München"),
        at(1, "Munich"),
        at(1, "München"),
        { town: null, nuts: "DE21", from: "area" },
      ]),
    ).toEqual([
      {
        geonameId: 1,
        name: "München",
        geonamesName: "Munich",
        region: "Bavaria",
        country: "de",
        latitude: 48.14,
        longitude: 11.58,
        offers: 3,
        // «Múnich» is GeoNames' own name with an accent, «Mn» too short.
        otherNames: ["Monaco di Baviera"],
      },
      {
        geonameId: 2,
        name: "Göteborg",
        geonamesName: "",
        region: "Västra Götaland",
        country: "se",
        latitude: 57.71,
        longitude: 11.97,
        offers: 1,
        otherNames: ["Gotemburgo"],
      },
    ]);
  });

  it("orders towns of as many offers by GeoNames id", () => {
    expect(
      townsInUse(gazetteer, [at(2, "Göteborg"), at(1, "Munich")]).map(
        (town) => town.geonameId,
      ),
    ).toEqual([1, 2]);
  });
});

describe("regions in use (FR-8)", () => {
  it("counts each country's regions and provinces by the codes offers' NUTS codes begin with", () => {
    const nuts = {
      regions: {
        es: { ES51: ["Cataluña", "Catalunya"], ES30: ["Comunidad de Madrid"] },
      },
      provinces: { es: { ES511: ["Barcelona"], ES300: ["Madrid"] } },
      areas: {
        es: {
          catalunya: "ES51",
          cataluna: "ES51",
          catalonia: "ES51",
          barcelona: "ES511",
        },
      },
    };
    expect(
      regionsInUse(nuts, [
        { country: "es", nuts: "ES511" },
        { country: "es", nuts: "ES51" },
        { country: "es", nuts: null },
        { country: "es", nuts: "ES300" },
      ]),
    ).toEqual({
      regions: {
        es: {
          ES51: {
            names: ["Cataluña", "Catalunya"],
            otherNames: ["catalonia"],
            offers: 2,
          },
          ES30: { names: ["Comunidad de Madrid"], otherNames: [], offers: 1 },
        },
      },
      provinces: {
        es: {
          ES511: { names: ["Barcelona"], otherNames: [], offers: 1 },
          ES300: { names: ["Madrid"], otherNames: [], offers: 1 },
        },
      },
    });
  });
});
