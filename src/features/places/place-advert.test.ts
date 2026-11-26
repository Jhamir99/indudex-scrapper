import { describe, expect, it } from "vitest";
import { readPlaces } from "../../shared/catalogues/places.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { smallGazetteer } from "../../../test/places/gazetteer.js";
import { createPlacer, Placement } from "./index.js";
import {
  atMost,
  namedTown,
  placeAdvert,
  type PlaceInput,
} from "./place-advert.js";

const advert = (country: string, location: string, city = ""): PlaceInput => ({
  country,
  location,
  city,
  title: "Electrical engineer",
  description: "",
  agency: false,
});

const spain = smallGazetteer(
  [
    [6, "Terrassa", "es", "Catalonia", 41.5667, 2.0167, 215121, []],
    [7, "Montcada i Reixac", "es", "Catalonia", 41.48, 2.19, 36000, []],
    [8, "la Garriga", "es", "Catalonia", 41.68, 2.28, 16000, []],
    [9, "Valencia", "es", "Valencia", 39.47, -0.38, 800000, ["València"]],
    [
      1,
      "Munich",
      "de",
      "Bavaria",
      48.1374,
      11.5755,
      1505005,
      ["München", "Munchen"],
    ],
  ],
  {
    towns: { "6": "ES511", "7": "ES511", "8": "ES511", "9": "ES523" },
    areas: { es: { barcelona: "ES511", "comunidad valenciana": "ES52" } },
  },
);

describe("placing an advert (FR-1, FR-5, FR-7)", () => {
  it("gives the town, its coordinates to two decimals and its NUTS 3 code", () => {
    const placement = placeAdvert(
      spain,
      advert("es", "Terrassa, BARCELONA, ES", "Barcelona"),
    );
    expect(placement).toEqual({
      town: {
        geonameId: 6,
        name: "Terrassa",
        latitude: 41.57,
        longitude: 2.02,
      },
      nuts: "ES511",
      from: "location",
    });
    expect(Placement.parse(placement)).toEqual(placement);
  });

  it("gives the area alone to a place that names no town it knows", () => {
    expect(placeAdvert(spain, advert("es", "Barcelona provincia"))).toEqual({
      town: null,
      nuts: "ES511",
      from: "area",
    });
  });

  it("gives nothing to a place that names neither", () => {
    expect(placeAdvert(spain, advert("es", "España"))).toEqual({
      town: null,
      nuts: null,
      from: null,
    });
  });

  it.each([
    ["MONTCADA I REIXAC", "Montcada i Reixac"],
    ["la Garriga", "La Garriga"],
    ["Valencia", "Valencia"],
  ])("shows «%s» as «%s»", (location, shown) => {
    expect(placeAdvert(spain, advert("es", location)).town?.name).toBe(shown);
  });

  it("shows a town written without its accents in GeoNames' letters («Munchen» is «München»)", () => {
    expect(placeAdvert(spain, advert("de", "Munchen")).town?.name).toBe(
      "München",
    );
  });

  it("gives the same placement each time", () => {
    const input = advert("es", "Terrassa");
    expect(placeAdvert(spain, input)).toEqual(placeAdvert(spain, input));
  });

  it("reads a place only up to its limit, cut at a word", () => {
    expect(atMost("Terrassa Barcelona", 12)).toBe("Terrassa");
    expect(atMost("Terrassa", 12)).toBe("Terrassa");
    expect(atMost("Terrassaaaaaaaaa", 12)).toBe("Terrassaaaaa");
    const long = `Terrassa, ${"x ".repeat(5000)}`;
    expect(placeAdvert(spain, advert("es", long)).town?.name).toBe("Terrassa");
  });
});

describe("the town a place names (the legacy's 077eb06c and 21dd1a49)", () => {
  it("puts the article back before its town, an elided one always", () => {
    expect(placeAdvert(spain, advert("es", "Garriga, La")).town?.name).toBe(
      "La Garriga",
    );
    expect(namedTown(spain, advert("es", "ALDEA, L'"))).toBe("L'Aldea");
    expect(namedTown(spain, advert("es", "Asturias, AS"))).toBe("Asturias");
  });

  it("writes a town the map lacks, in capitals, in a name's letters", () => {
    expect(
      [
        advert("es", "SEU D'URGELL"),
        advert("de", "BAD SODEN AM TAUNUS"),
        advert("gb", "LONDON UK"),
      ].map((place) => namedTown(smallGazetteer([]), place)),
    ).toEqual(["Seu d'Urgell", "Bad Soden am Taunus", "London UK"]);
  });
});

describe("the placer over the real catalogues (FR-9)", () => {
  it("places adverts with the gazetteer compiled once", async () => {
    const placer = createPlacer({
      places: await readPlaces(),
      nuts: await readCatalogue("nuts"),
      countries: (await readCatalogue("countries")).countries,
    });
    expect(placer.place(advert("de", "München, Bayern")).town?.name).toBe(
      "München",
    );
    expect(
      placer.place(
        advert("es", "08940 Cornellà de Llobregat, Barcelona provincia"),
      ),
    ).toMatchObject({ town: { name: "Cornellà de Llobregat" }, nuts: "ES511" });
    expect(placer.place(advert("be", "Provincie West-Vlaanderen"))).toEqual({
      town: null,
      nuts: "BE25",
      from: "area",
    });
  });
});
