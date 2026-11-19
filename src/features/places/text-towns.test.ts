import { describe, expect, it } from "vitest";
import { smallGazetteer } from "../../../test/places/gazetteer.js";
import { placeAdvert } from "./place-advert.js";
import { labelledTowns, phraseTowns, postalTowns } from "./text-towns.js";

describe("towns from postcodes (FR-6)", () => {
  it("reads the words after a country's postcode, in its own form only", () => {
    expect(postalTowns("Otto-Hahn-Straße 21 · 89073 Ulm", "de")).toEqual([
      "Ulm",
    ]);
    expect(postalTowns("rund 25000 Mitarbeiter", "de")).toEqual([
      "Mitarbeiter",
    ]);
    expect(postalTowns("64-100 Leszno", "de")).toEqual([]);
    expect(postalTowns("64-100 Leszno", "pl")).toEqual(["Leszno"]);
    expect(postalTowns("D-84579 Unterneukirchen", "de")).toEqual([
      "Unterneukirchen",
    ]);
    expect(postalTowns("2511 CV Den Haag", "nl")).toEqual(["Den Haag", "Den"]);
  });

  it("reads a Catalan town whole: «del», «dels», a hyphen, its article, «l'» (NO1-02)", () => {
    expect(
      [
        "08100 Mollet del Vallès",
        "08211 Castellar del Vallès",
        "08174 Sant Cugat del Vallès",
        "08720 Vilafranca del Penedès",
        "08620 Sant Vicenç dels Horts",
        "43480 Vila-seca",
        "08530 La Garriga",
        "17130 l'Escala",
        "43890 l'Hospitalet de l'Infant",
        "08870 Sitges i rodalies",
      ].map((address) => postalTowns(address, "es")[0]),
    ).toEqual([
      "Mollet del Vallès",
      "Castellar del Vallès",
      "Sant Cugat del Vallès",
      "Vilafranca del Penedès",
      "Sant Vicenç dels Horts",
      "Vila-seca",
      "La Garriga",
      "l'Escala",
      "l'Hospitalet de l'Infant",
      "Sitges",
    ]);
  });

  it("reads no saint alone, «d'», «do», «de los»", () => {
    expect(postalTowns("08174 Sant Cugat del Vallès", "es")).toEqual([
      "Sant Cugat del Vallès",
    ]);
    expect(postalTowns("59650 Villeneuve-d'Ascq", "fr")[0]).toBe(
      "Villeneuve-d'Ascq",
    );
    expect(postalTowns("4900-001 Viana do Castelo", "pt")[0]).toBe(
      "Viana do Castelo",
    );
    expect(postalTowns("28700 San Sebastián de los Reyes", "es")[0]).toBe(
      "San Sebastián de los Reyes",
    );
  });
});

describe("towns from labelled lines (FR-6)", () => {
  it("reads a label's first words", () => {
    expect(labelledTowns("Aufgaben\nArbeitsort: Lüdenscheid\n", false)).toEqual(
      ["Lüdenscheid"],
    );
    expect(labelledTowns("Lugar de trabajo: Getafe (Madrid)", false)).toEqual([
      "Getafe",
    ]);
    expect(labelledTowns("• Job location: 12345 Leeds, UK", false)).toEqual([
      "Leeds",
    ]);
  });

  it("reads an agency's job only by the job's own labels", () => {
    expect(labelledTowns("Standort: Wiesbaden", true)).toEqual([]);
    expect(labelledTowns("Standort: Wiesbaden", false)).toEqual(["Wiesbaden"]);
    expect(labelledTowns("Einsatzort: Mainz", true)).toEqual(["Mainz"]);
  });

  it("reads a Czech caption's words and each shorter run, but not the country", () => {
    expect(
      labelledTowns("Lokalita Jihlava a další Úvazek Plný úvazek", false),
    ).toEqual(["Jihlava"]);
    expect(labelledTowns("Lokalita Ústí nad Labem", false)).toEqual([
      "Ústí nad Labem",
      "Ústí",
    ]);
    expect(labelledTowns("Lokalita Česká republika", false)).toEqual([]);
  });
});

const advert = (
  country: string,
  location: string,
  description: string,
  agency = false,
) => ({ country, location, city: "", title: "Monteur", description, agency });

describe("placing an advert by its text (FR-6)", () => {
  const germany = smallGazetteer(
    [
      [5, "Ulm", "de", "Baden-Wurttemberg", 48.3984, 9.9916, 126329, []],
      [9, "Wiesbaden", "de", "Hesse", 50.08, 8.24, 278000, []],
    ],
    { towns: { "5": "DE144", "9": "DE714" } },
    [{ iso: "de", name: "Germany", aliases: ["Deutschland"] }],
  );
  const dutch = smallGazetteer(
    [
      [10, "Venlo", "nl", "Limburg", 51.37, 6.17, 101192, []],
      [11, "Eindhoven", "nl", "North Brabant", 51.44, 5.48, 235691, []],
    ],
    {
      towns: { "10": "NL423", "11": "NL414" },
      areas: { nl: { limburg: "NL42" } },
    },
    [{ iso: "nl", name: "Netherlands", aliases: ["Nederland"] }],
  );

  it("places an advert that names only its country by the first town of the text", () => {
    expect(
      placeAdvert(
        germany,
        advert("de", "Deutschland", "Wir, rund 25000 Mitarbeiter.\n89073 Ulm"),
      ),
    ).toMatchObject({ town: { name: "Ulm" }, nuts: "DE144", from: "text" });
  });

  it("takes a town the text gives inside the region the place names, not one outside", () => {
    expect(
      placeAdvert(dutch, advert("nl", "Limburg, NL", "Werklocatie: Venlo")),
    ).toMatchObject({ town: { name: "Venlo" }, nuts: "NL423", from: "text" });
    expect(
      placeAdvert(dutch, advert("nl", "Limburg, NL", "Werklocatie: Eindhoven")),
    ).toEqual({ town: null, nuts: "NL42", from: "area" });
  });

  it("does not read the text of a place that names a town of its own", () => {
    expect(
      placeAdvert(germany, advert("de", "Kleinhausen", "89073 Ulm")),
    ).toEqual({ town: null, nuts: null, from: null });
  });

  it("does not take an agency's branch, nor a client job's postcode", () => {
    expect(
      placeAdvert(
        germany,
        advert("de", "Deutschland", "Standort: Wiesbaden", true),
      ),
    ).toEqual({ town: null, nuts: null, from: null });
    expect(
      placeAdvert(
        germany,
        advert(
          "de",
          "Deutschland",
          "Für unseren Kunden suchen wir... 89073 Ulm",
        ),
      ),
    ).toEqual({ town: null, nuts: null, from: null });
  });
});

describe("towns from phrases (FR-6)", () => {
  it.each([
    ["Elektriker (m/w/d) in Oppenheim", "", "de", ["Oppenheim"]],
    ["Servicetechniker – Salem", "", "de", ["Salem"]],
    ["Monteur Region Mannheim", "", "de", ["Mannheim"]],
    [
      "Techniker",
      "Für unseren Standort Wittlich suchen wir",
      "de",
      ["Wittlich"],
    ],
    ["Techniker", "Unsere Niederlassung in Hilgert sucht", "de", ["Hilgert"]],
    ["Techniker", "Der Hauptsitz in Wiesbaden ist", "de", []],
    [
      "Techniker",
      "Standort Bad Oldesloe Vollzeit",
      "de",
      ["Bad Oldesloe Vollzeit", "Bad Oldesloe", "Bad"],
    ],
    ["Monteur regio Zwolle", "", "nl", ["Zwolle"]],
    [
      "Monteur",
      "Voor onze vestiging Eindhoven zoeken wij",
      "nl",
      ["Eindhoven"],
    ],
    ["Technicien", "Poste basé à Strasbourg", "fr", ["Strasbourg"]],
    ["Ingénieur", "Sur notre site de Palaiseau", "fr", ["Palaiseau"]],
    ["Engineer", "The role is based in Redhill", "gb", ["Redhill"]],
    ["Engineer - London E", "", "gb", ["London E", "London"]],
    ["Guide near Buckingham Palace", "", "gb", ["Buckingham Palace"]],
    ["Technico-Commercial(E) H/F", "", "fr", []],
    ["Engineer (Blyth)", "", "gb", ["Blyth"]],
    ["Engineer (Bridge & Structures)", "", "gb", []],
    ["Engineer in Madrid", "", "es", []],
  ])("reads «%s» «%s» in %s as %j", (title, text, country, towns) => {
    expect(phraseTowns(title, text, false, country)).toEqual(towns);
  });

  it("reads an agency's title, never its text", () => {
    expect(
      phraseTowns("Techniker", "Unser Team in Hannover", true, "de"),
    ).toEqual([]);
    expect(
      phraseTowns(
        "Techniker in Oppenheim",
        "Unser Team in Hannover",
        true,
        "de",
      ),
    ).toEqual(["Oppenheim"]);
  });

  it("places an advert by its title's phrase when its place names only the country", () => {
    const germany = smallGazetteer(
      [[12, "Oppenheim", "de", "Rhineland-Palatinate", 49.85, 8.36, 7500, []]],
      { towns: { "12": "DEB3J" } },
      [{ iso: "de", name: "Germany", aliases: ["Deutschland"] }],
    );
    expect(
      placeAdvert(germany, {
        country: "de",
        location: "Deutschland",
        city: "",
        title: "Elektriker (m/w/d) in Oppenheim",
        description: "",
        agency: false,
      }),
    ).toMatchObject({ town: { name: "Oppenheim" }, from: "text" });
  });
});
