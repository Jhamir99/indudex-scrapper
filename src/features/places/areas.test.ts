import { describe, expect, it } from "vitest";
import {
  realGazetteer,
  smallGazetteer,
} from "../../../test/places/gazetteer.js";
import { areaCode, areaOf } from "./areas.js";

const spain = smallGazetteer([], {
  areas: {
    es: {
      barcelona: "ES511",
      catalonia: "ES51",
      cataluna: "ES51",
      madrid: "ES300",
      "comunidad de madrid": "ES30",
    },
  },
});

const place = (country: string, location: string, city = "") => ({
  country,
  location,
  city,
});

describe("the area a place names (FR-5)", () => {
  it("names an area by any of its names, with or without a province's word", () => {
    expect(areaCode(spain, "es", "Barcelona")).toBe("ES511");
    expect(areaCode(spain, "es", "Barcelona provincia")).toBe("ES511");
    expect(areaCode(spain, "es", "Provincia de Madrid")).toBe("ES300");
    expect(areaCode(spain, "es", "Sevilla")).toBe("");
  });

  it("takes the most precise of nested areas", () => {
    expect(areaOf(spain, place("es", "Terrassa, Barcelona, Catalonia"))).toBe(
      "ES511",
    );
  });

  it("names none for areas that do not nest", () => {
    expect(areaOf(spain, place("es", "Madrid, Barcelona"))).toBe("");
  });

  it("leaves out the town's own name", () => {
    expect(
      areaOf(spain, place("es", "Barcelona, Catalonia"), "Barcelona"),
    ).toBe("ES51");
  });

  it("takes the first of loose names that disagree («Bedfordshire, South East»)", () => {
    const england = smallGazetteer([], {
      areas: { gb: { "greater manchester": "UKD3" } },
      otherNames: { gb: { bedfordshire: "UKH24", "south east": "UKJ" } },
    });
    expect(
      areaOf(england, place("gb", "Bedfordshire, South East"), "", true),
    ).toBe("UKH24");
    expect(areaOf(england, place("gb", "Bedfordshire, South East"))).toBe("");
  });

  it("keeps the area NUTS's own name states over a loose one («Liverpool, Merseyside, Lancashire»)", () => {
    const england = smallGazetteer([], {
      areas: { gb: { merseyside: "UKD7" } },
      otherNames: { gb: { lancashire: "UKD4" } },
    });
    expect(
      areaOf(
        england,
        place("gb", "Liverpool, Merseyside, Lancashire"),
        "",
        true,
      ),
    ).toBe("UKD7");
  });

  it.each([
    ["be", "Provincie West-Vlaanderen", /^BE25/],
    ["ch", "Kanton Zürich", /^CH04/],
    ["es", "Barcelona provincia", /^ES511/],
    ["it", "Provincia di Torino", /^ITC11/],
    ["hr", "Osječko-baranjska županija", /^HR02/],
    ["nl", "Noord-Brabant", /^NL41/],
  ])("finds the real %s area «%s»", async (country, location, code) => {
    const gazetteer = await realGazetteer();
    expect(areaOf(gazetteer, place(country, location), "", true)).toMatch(code);
  });
});
