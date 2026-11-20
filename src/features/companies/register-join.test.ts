import { describe, expect, it } from "vitest";
import type { KeptRegisterCompany } from "../../shared/storage/registers-file.js";
import { companyKey, townKey } from "./company-key.js";
import type { CompanyRow, DirectoryOffer } from "./directory.js";
import {
  type KnownEmployer,
  registerJoin,
  withRegisters,
} from "./register-join.js";

// The legacy's own cases (test/companies.test.mjs), rows as named fields.
const row = (
  name: string,
  count: number,
  group: string,
  places: Record<string, number>,
  town: string,
  townNuts: string,
): CompanyRow => ({ name, count, group, places, town, townNuts });

const company = (
  name: string,
  country: string,
  nuts: string,
  town: string,
  people = 0,
  website = "",
): KeptRegisterCompany => ({
  id: name,
  name,
  country,
  nuts,
  town,
  nace: "7112",
  register: "sirene",
  ...(people ? { people } : {}),
  ...(website ? { website } : {}),
});

const offer = (
  employer: string,
  country: string,
  town: string,
  nuts: string,
): DirectoryOffer => ({
  employer,
  families: [],
  country,
  town,
  nuts,
});

const known = (
  name: string,
  {
    home = "",
    towns = [] as string[],
    places = [] as string[],
    countries = [] as string[],
    now = [] as string[],
    regions = [] as string[],
  } = {},
): KnownEmployer => ({
  row: row(name, 0, "", {}, "", ""),
  home,
  towns: new Set(towns),
  places: new Set(places),
  countries: new Set(countries),
  now: { towns: new Set(now), regions: new Set(regions) },
});
const lone = (key: string, employer: KnownEmployer) => (k: string) =>
  k === key ? employer : undefined;
const joinedName = (
  fields: Partial<KeptRegisterCompany> & Pick<KeptRegisterCompany, "name">,
  employer: (key: string) => KnownEmployer | undefined,
) =>
  registerJoin(
    {
      id: "1",
      country: "fr",
      town: "",
      nuts: "",
      nace: "",
      register: "sirene",
      ...fields,
    },
    employer,
  )?.row.name ?? "";

const one = (
  name: string,
  town: string,
  nuts: string,
  people: number,
  employer: KnownEmployer,
) => joinedName({ name, town, nuts, people }, lone(companyKey(name), employer));

describe("registers joined with the employers (companies FR-7)", () => {
  const employers = [
    row(
      "Siemens",
      4,
      "engineers",
      { DE212: 2, ES511: 1, es: 1 },
      "München",
      "DE212",
    ),
    row(
      "Kongsberg Maritime",
      3,
      "engineers",
      { NO093: 2, NO082: 1 },
      "Horten",
      "NO093",
    ),
    row("ABB", 2, "engineers", { CH040: 2 }, "Zürich", "CH040"),
    row(
      "Barry Callebaut",
      7,
      "engineers",
      { BE232: 2, es: 0 },
      "Lebbeke",
      "BE232",
    ),
    row("Meta", 30, "software-it", { UKI32: 25, FR101: 5 }, "London", "UKI32"),
    row(
      "Synergie",
      250,
      "technicians",
      { FR106: 4, FRF34: 2 },
      "Gent",
      "BE234",
    ),
  ];
  const { local, same, listed } = withRegisters(
    employers,
    [
      company("KONGSBERG MARITIME AS", "no", "NO082", "Kongsberg", 2000),
      company("SIEMENS SA", "es", "ES300", "Madrid", 3000),
      company("ABB AS", "no", "NO081", "Oslo", 1500, "www.abb.no"),
      company("BRUNSTAD AS", "no", "NO0A3", "Sykkylven", 42, "brunstad.no"),
      company("Brunstad A/S", "no", "NO0A3", "Sykkylven", 12),
      company(
        "BARRY CALLEBAUT MANUFACTURING IBERICA, SAU",
        "es",
        "ES511",
        "Gurb",
      ),
      company("BARRY CALLEBAUT FRANCE", "fr", "FR103", "Hardricourt", 250),
      company("CALLEBAUT PERE ET FILS", "fr", "FRF23", "Isles-sur-Suippe", 10),
      company("META", "fr", "FR101", "Paris", 10),
      company("SYNERGIE", "fr", "FR106", "Bobigny", 20),
      company("SYNERGIE MAINTENANCE", "fr", "FRF34", "Thaon-les-Vosges", 10),
    ],
    [
      offer("Barry Callebaut", "es", "Gurb", "ES511"),
      offer("Synergie", "fr", "Bobigny", "FR106"),
      offer("Meta", "fr", "Paris", "FR101"),
    ],
  );

  it("takes a company of the same name in a province the employer has offers in for that employer, with its town", () => {
    expect(
      [...same].map(([employer, found]) => [employer.name, found.name]),
    ).toEqual([["Kongsberg Maritime", "KONGSBERG MARITIME AS"]]);
    expect(employers[1]).toEqual(
      row(
        "Kongsberg Maritime",
        3,
        "engineers",
        { NO093: 2, NO082: 1 },
        "Kongsberg",
        "NO082",
      ),
    );
    expect(employers[0]).toEqual(
      row(
        "Siemens",
        4,
        "engineers",
        { DE212: 2, ES511: 1, es: 1 },
        "München",
        "DE212",
      ),
    );
  });

  it("lets a company belong to an employer near its offers", () => {
    expect(
      listed
        .filter(([, , employer]) => employer)
        .map(([found, , employer]) => [found.name, employer?.name]),
    ).toEqual([
      ["BARRY CALLEBAUT MANUFACTURING IBERICA, SAU", "Barry Callebaut"],
    ]);
  });

  it("lists the others once per country, the largest kept, A to Z, with their website", () => {
    expect({ ...local }).toEqual({
      es: [
        ["Barry Callebaut Manufacturing Iberica, SAU", "ES511", "Gurb", ""],
        ["Siemens SA", "ES300", "Madrid", ""],
      ],
      no: [
        ["ABB AS", "NO081", "Oslo", "https://www.abb.no"],
        ["Brunstad AS", "NO0A3", "Sykkylven", "https://brunstad.no"],
      ],
      fr: [
        ["Barry Callebaut France", "FR103", "Hardricourt", ""],
        ["Callebaut Pere et Fils", "FRF23", "Isles-sur-Suippe", ""],
        ["Meta", "FR101", "Paris", ""],
        ["Synergie", "FR106", "Bobigny", ""],
        ["Synergie Maintenance", "FRF34", "Thaon-les-Vosges", ""],
      ],
    });
  });

  it("joins no look-alike: a name any company could bear, a place or short brand with a unit, a one-word name away from home", () => {
    const places = ["FRD11", "FR105", "FRL05", "FRJ23", "FRH03", "NO0A2"];
    const list: Record<string, KnownEmployer> = {
      ouest: known("Ouest", { places }),
      international: known("LTD INTERNATIONAL", { places }),
      bergen: known("Bergen", { places }),
      var: known("Var Group", { places }),
      gb: known("Groupe GB", { places }),
      sap: known("SAP", { places }),
      atos: known("Atos", { places, home: "fr|courbevoie" }),
    };
    const employer = (key: string) =>
      Object.hasOwn(list, key) ? list[key] : undefined;
    expect(
      [
        { name: "OUEST CONSULTING", town: "Rennes", nuts: "FRH03" },
        { name: "AS INTERNATIONAL", town: "Neuilly-sur-Seine", nuts: "FR105" },
        {
          name: "BERGEN ENERGY AS",
          town: "Bergen",
          nuts: "NO0A2",
          country: "no",
        },
        { name: "VAR INDUSTRIE", town: "Six-Fours-les-Plages", nuts: "FRL05" },
        { name: "GB ENERGIES", town: "Colomiers", nuts: "FRJ23" },
        { name: "ATOS", town: "Glos", nuts: "FRD11" },
      ].map((fields) => joinedName(fields, employer)),
    ).toEqual(["", "", "", "", "", ""]);
    expect([
      joinedName(
        { name: "SAP FRANCE", town: "Levallois-Perret", nuts: "FR105" },
        employer,
      ),
      joinedName({ name: "ATOS", town: "Courbevoie", nuts: "FR105" }, employer),
    ]).toEqual(["SAP", "Atos"]);
  });

  it("keeps apart what each rule alone keeps apart", () => {
    const gurb = known("Barry Callebaut", {
      towns: ["es|gurb"],
      places: ["ES511"],
    });
    expect([
      joinedName(
        {
          name: "BARRY CALLEBAUT CHOCOLATE SHOP",
          town: "Gurb",
          nuts: "ES511",
          country: "es",
        },
        lone("barry callebaut", gurb),
      ),
      joinedName(
        { name: "OUEST FRANCE", town: "Rennes", nuts: "FRH03" },
        lone(
          "ouest",
          known("Ouest", { towns: ["fr|rennes"], places: ["FRH03"] }),
        ),
      ),
      joinedName(
        { name: "GB FRANCE", town: "Colomiers", nuts: "FRJ23" },
        lone(
          "gb",
          known("Groupe GB", { towns: ["fr|colomiers"], places: ["FRJ23"] }),
        ),
      ),
      joinedName(
        { name: "INTERNATIONAL", town: "Neuilly-sur-Seine", nuts: "FR105" },
        lone(
          "international",
          known("LTD INTERNATIONAL", {
            home: `fr|${townKey("Neuilly-sur-Seine")}`,
          }),
        ),
      ),
      joinedName(
        { name: "SOCIETE", town: "Paris", nuts: "FR101", people: 10 },
        lone("societe", known("Société", { home: "fr|paris" })),
      ),
    ]).toEqual(["", "", "", "", ""]);
  });

  it("takes a large one-word company for the employer where it publishes today, and a longer name in its country", () => {
    const airbus = known("Airbus", {
      home: "es|getafe",
      now: ["fr|toulouse"],
      regions: ["FRJ2"],
    });
    expect([
      one("AIRBUS", "Blagnac", "FRJ23", 10000, airbus),
      one("AIRBUS", "Blagnac", "FRJ23", 10, airbus),
      one(
        "STB",
        "Hillion",
        "FRH01",
        500,
        known("STB", {
          home: "nl|houten",
          now: ["fr|yffiniac"],
          regions: ["FRH0"],
        }),
      ),
      one(
        "SCHMIDT GROUPE",
        "Lièpvre",
        "FRF12",
        1000,
        known("Schmidt & Co. GmbH", {
          home: "de|greven",
          now: ["fr|lievre"],
          regions: ["FRF1"],
        }),
      ),
      one(
        "AG PLOMBERIE",
        "Valencin",
        "FRK24",
        10,
        known("AG Plomberie", {
          home: `fr|${townKey("Valencin")}`,
          towns: [`fr|${townKey("Valencin")}`],
        }),
      ),
      one(
        "SAFRAN AIRCRAFT ENGINES",
        "Paris",
        "FR101",
        10000,
        known("Safran Aircraft Engines", {
          countries: ["fr"],
          places: ["FR104"],
        }),
      ),
      one(
        "ECO ELEC",
        "Béziers",
        "FRJ13",
        20,
        known("ECO ELEC", { countries: ["fr"], places: ["FRD22"] }),
      ),
    ]).toEqual([
      "Airbus",
      "",
      "",
      "",
      "AG Plomberie",
      "Safran Aircraft Engines",
      "",
    ]);
  });
});
