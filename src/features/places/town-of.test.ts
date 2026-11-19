import { describe, expect, it } from "vitest";
import {
  realGazetteer,
  smallGazetteer,
} from "../../../test/places/gazetteer.js";
import type { Gazetteer } from "./gazetteer.js";
import { townOf } from "./town-of.js";

const idOf = (
  gazetteer: Gazetteer,
  country: string,
  location: string,
  city = "",
) => townOf(gazetteer, { country, location, city })?.town.geonameId ?? null;

// The legacy's own test catalogues (test/builder.test.mjs).
const germanyAndSpain = smallGazetteer([
  [
    1,
    "Munich",
    "de",
    "Bavaria",
    48.1374,
    11.5755,
    1505005,
    ["München", "Muenchen"],
  ],
  [
    2,
    "Frankfurt am Main",
    "de",
    "Hesse",
    50.1155,
    8.6842,
    650000,
    ["Frankfurt"],
  ],
  [
    3,
    "Frankfurt (Oder)",
    "de",
    "Brandenburg",
    52.3471,
    14.5506,
    57107,
    ["Frankfurt"],
  ],
  [4, "Cornellà de Llobregat", "es", "Catalonia", 41.35, 2.0833, 87173, []],
  [5, "Ulm", "de", "Baden-Wurttemberg", 48.3984, 9.9916, 126329, []],
  [6, "Terrassa", "es", "Catalonia", 41.5667, 2.0167, 215121, []],
  [7, "Barcelona", "es", "Catalonia", 41.3888, 2.159, 1686208, []],
]);

describe("the town a place names (FR-1 to FR-4)", () => {
  it("finds a town by any of its names, and without its postcode", () => {
    expect(idOf(germanyAndSpain, "de", "München, Bayern", "München")).toBe(1);
    expect(
      idOf(
        germanyAndSpain,
        "es",
        "08940 Cornellà de Llobregat, Barcelona provincia",
      ),
    ).toBe(4);
  });

  it("takes, of two towns of one name, the one in the region named, else the bigger", () => {
    expect(
      idOf(germanyAndSpain, "de", "Frankfurt (Oder), Brandenburg", "Frankfurt"),
    ).toBe(3);
    expect(idOf(germanyAndSpain, "de", "Frankfurt, Hessen", "Frankfurt")).toBe(
      2,
    );
  });

  it("tries the most precise piece first", () => {
    expect(
      idOf(germanyAndSpain, "es", "Terrassa, BARCELONA, ES", "Barcelona"),
    ).toBe(6);
  });

  it("finds a district's town; only in the advert's country; no town, no place", () => {
    expect(
      idOf(germanyAndSpain, "de", "Ulm-Jungingen, BW", "Ulm-Jungingen"),
    ).toBe(5);
    expect(idOf(germanyAndSpain, "es", "München", "München")).toBeNull();
    expect(idOf(germanyAndSpain, "de", "bundesweit, DE")).toBeNull();
  });

  it("keeps a town that shares its name with its district", () => {
    const saxony = smallGazetteer(
      [
        [8, "Leipzig", "de", "Saxony", 51.34, 12.37, 504971, []],
        [9, "Dresden", "de", "Saxony", 51.05, 13.74, 486854, []],
      ],
      {
        towns: { "8": "DED51", "9": "DED21" },
        areas: { de: { leipzig: "DED52", sachsen: "DED", bayern: "DE2" } },
      },
    );
    expect(idOf(saxony, "de", "Leipzig", "Leipzig")).toBe(8);
    expect(idOf(saxony, "de", "Leipzig, Sachsen, DE", "Leipzig")).toBe(8);
  });

  it("reads a town «bei» another, the nearest of its name; none where nothing tells; a town before its county", () => {
    const by = smallGazetteer(
      [
        [
          20,
          "Bornheim",
          "de",
          "North Rhine-Westphalia",
          50.76,
          6.99,
          48000,
          [],
        ],
        [21, "Bornheim", "de", "Rhineland-Palatinate", 49.22, 8.17, 1500, []],
        [
          22,
          "Landau in der Pfalz",
          "de",
          "Rhineland-Palatinate",
          49.2,
          8.11,
          46000,
          ["Landau"],
        ],
        [23, "Ergolding", "de", "Bavaria", 48.58, 12.21, 12000, []],
        [
          24,
          "Biberach an der Riß",
          "de",
          "Baden-Wurttemberg",
          48.1,
          9.79,
          33000,
          ["Biberach"],
        ],
        [25, "Biberach", "de", "Baden-Wurttemberg", 48.34, 8.03, 3500, []],
        [26, "Swindon", "gb", "England", 51.56, -1.78, 185609, []],
      ],
      {
        towns: {
          "20": "DEA2C",
          "21": "DEB3H",
          "22": "DEB33",
          "23": "DE227",
          "24": "DE146",
          "25": "DE134",
          "26": "UKK14",
        },
        areas: { gb: { wiltshire: "UKK1" } },
      },
    );
    expect(idOf(by, "de", "Ergolding bei Landshut")).toBe(23);
    expect(idOf(by, "de", "Bornheim bei Landau Pfalz, DE, 76879")).toBe(21);
    expect(idOf(by, "de", "Biberach im Kinzigtal")).toBeNull();
    expect(idOf(by, "gb", "Swindon Wiltshire")).toBe(26);
  });

  it("takes, of towns of one name «in der» an area, the one in that area", () => {
    const palatinate = smallGazetteer(
      [
        [70, "Mühlhausen", "de", "Thuringia", 51.21, 10.45, 38108, []],
        [71, "Mühlhausen", "de", "Bavaria", 49.16, 11.43, 3700, []],
      ],
      {
        towns: { "70": "DEG09", "71": "DE236" },
        areas: { de: { oberpfalz: "DE23" } },
      },
    );
    expect(idOf(palatinate, "de", "Mühlhausen in der Oberpfalz")).toBe(71);
  });

  it("reads «St» as «Saint», France proper's town before an overseas one unless its department is named", () => {
    const saints = smallGazetteer(
      [
        [30, "Saint-Denis", "fr", "Île-de-France", 48.94, 2.36, 113000, []],
        [31, "Saint-Denis", "fr", "Réunion", -20.88, 55.45, 0, ["St. Denis"]],
        [
          32,
          "Saint-Nazaire",
          "fr",
          "Pays de la Loire",
          47.28,
          -2.21,
          70000,
          [],
        ],
      ],
      { towns: { "30": "FR106", "31": "FRY40", "32": "FRG01" } },
    );
    expect(
      [
        "St Denis, France",
        "ST DENIS, FR, 93210",
        "Saint-Denis, Réunion",
        "St Nazaire, France",
      ].map((location) => idOf(saints, "fr", location)),
    ).toEqual([30, 30, 31, 32]);
  });

  it("reads a district small or great of its town, and a Belgian place without its article", () => {
    const lancy = smallGazetteer(
      [[33, "Lancy", "ch", "Geneva", 46.19, 6.12, 31000, []]],
      { towns: { "33": "CH013" } },
    );
    expect(idOf(lancy, "ch", "Petit-Lancy, CH")).toBe(33);
    const bizet = smallGazetteer(
      [[36, "Le Bizet", "be", "Wallonia", 50.71, 2.88, 0, []]],
      { towns: { "36": "BE328" } },
    );
    expect(idOf(bizet, "be", "Bizet, België")).toBe(36);
  });

  it("reads the Nordic letters written without them, and keeps a name to the town that goes by it (NOB-17)", () => {
    const nordic = smallGazetteer([
      [42, "Bærum", "no", "Viken", 59.9, 10.5, 127731, []],
      [43, "Lillestrøm", "no", "Viken", 59.96, 11.05, 85000, []],
      [44, "Ålesund", "no", "Møre og Romsdal", 62.47, 6.15, 67000, []],
      [45, "Mörs", "de", "North Rhine-Westphalia", 51.45, 6.62, 100, []],
      [46, "Moers", "de", "North Rhine-Westphalia", 51.45, 6.63, 104000, []],
    ]);
    expect(
      ["Baerum", "Lillestrom", "Lillestroem", "Aalesund"].map((location) =>
        idOf(nordic, "no", location),
      ),
    ).toEqual([42, 43, 43, 44]);
    expect(idOf(nordic, "de", "Moers")).toBe(46);
  });

  it("reads a German saint cut short as «Sankt»", () => {
    const sankt = smallGazetteer(
      [
        [
          37,
          "Sankt Ulrich bei Steyr",
          "at",
          "Upper Austria",
          48.02,
          14.42,
          3000,
          [],
        ],
      ],
      { towns: { "37": "AT314" } },
    );
    expect(idOf(sankt, "at", "St. Ulrich bei Steyr, AT")).toBe(37);
  });

  it("finds a town behind codes in capitals and a science park's town; a two-letter code is no town", () => {
    const coded = smallGazetteer(
      [
        [38, "Warrington", "gb", "England", 53.39, -2.58, 165000, []],
        [39, "Cambridge", "gb", "England", 52.2, 0.12, 145000, []],
        [40, "Eu", "fr", "Normandy", 50.05, 1.42, 7000, []],
        [
          41,
          "Roissy-en-France",
          "fr",
          "Île-de-France",
          49.0,
          2.52,
          2800,
          ["Roissy"],
        ],
      ],
      { towns: { "38": "UKD61", "39": "UKH12", "40": "FRD22", "41": "FR108" } },
    );
    expect(idOf(coded, "gb", "OCONUS-UK-Warrington")).toBe(38);
    expect(idOf(coded, "gb", "Cambridge Science Park")).toBe(39);
    expect(idOf(coded, "fr", "FXE-EU/FRA/JPUB/Roissy OFFICE, France")).toBe(41);
  });

  it("places a British town under its historic county in the same part of England, not in another", () => {
    const lancashire = smallGazetteer(
      [
        [34, "Manchester", "gb", "England", 53.48, -2.24, 395515, []],
        [35, "Leeds", "gb", "England", 53.8, -1.55, 455123, []],
      ],
      {
        towns: { "34": "UKD33", "35": "UKE42" },
        areas: { gb: { lancashire: "UKD4" } },
      },
    );
    expect(
      idOf(lancashire, "gb", "Manchester, Lancashire, United Kingdom"),
    ).toBe(34);
    expect(idOf(lancashire, "gb", "Leeds, Lancashire")).toBeNull();
  });

  it("does not take a district's or a building's word for a town alone (NOB-10)", () => {
    const centro = smallGazetteer([
      [80, "Centro", "es", "Andalusia", 37.38, -5.99, 50000, []],
    ]);
    expect(idOf(centro, "es", "Centro")).toBeNull();
  });

  it("does not cut a region's hyphenated name into a town", () => {
    const baden = smallGazetteer(
      [
        [
          50,
          "Baden-Baden",
          "de",
          "Baden-Wurttemberg",
          48.76,
          8.24,
          55000,
          ["Baden"],
        ],
      ],
      { areas: { de: { "baden-wurttemberg": "DE1" } } },
    );
    expect(idOf(baden, "de", "Baden-Württemberg")).toBeNull();
  });

  it("finds the one town a broken letter fits, shown by that name", () => {
    const swiss = smallGazetteer([
      [60, "Brügg", "ch", "Bern", 47.12, 7.28, 4500, []],
      [61, "Brugg", "ch", "Aargau", 47.48, 8.21, 11000, []],
    ]);
    const found = townOf(swiss, { country: "ch", location: "Br�gg", city: "" });
    expect([found?.town.geonameId, found?.said]).toEqual([60, "Brügg"]);
  });
});

describe("the town a place names, in the real catalogues (FR-2 to FR-4)", () => {
  it.each([
    ["es", "Salamanca, Spain", "Salamanca", "ES415"],
    ["es", "San Isidro, Alicante", "San Isidro", "ES521"],
    ["es", "Garriga, La", "la Garriga", "ES511"],
    ["fr", "17 - Rochelle", "La Rochelle", "FRI32"],
    ["ch", "Z�rich", "Zürich", "CH040"],
    ["no", "Lillestroem", "Lillestrøm", "NO084"],
  ])("places %s «%s» in %s (%s)", async (country, location, name, nuts) => {
    const found = townOf(await realGazetteer(), {
      country,
      location,
      city: "",
    });
    expect([found?.town.name, found?.town.nuts]).toEqual([name, nuts]);
  });
});
