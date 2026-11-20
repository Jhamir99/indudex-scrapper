import { describe, expect, it } from "vitest";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import type { KeptRegisterCompany } from "../../shared/storage/registers-file.js";
import { cardKey, companyCards } from "./cards.js";
import type { CompanyRow, DirectoryOffer } from "./directory.js";
import { withRegisters } from "./register-join.js";

// The legacy's own cases (test/company-cards.test.mjs), its short keys as the port's names and
// without the careers page (016).
const families = await readCatalogue("families");
const groupOf = (family: string) =>
  families.families.find((one) => one.id === family)?.group ?? "";

const offer = (
  employer: string,
  country: string,
  town: string,
  nuts: string,
  more: Partial<DirectoryOffer> = {},
): DirectoryOffer => ({
  employer,
  families: ["2144"],
  country,
  town,
  nuts,
  ...more,
});

const barry = (): CompanyRow[] => [
  {
    name: "Barry Callebaut",
    count: 4,
    group: "engineers",
    places: { BE232: 1, BE241: 1, ES511: 1, NL411: 1 },
    town: "Lebbeke",
    townNuts: "BE232",
  },
];
const offers = [
  offer("Barry Callebaut", "be", "Lebbeke", "BE232", {
    pay: { low: 40000, high: 50000, currency: "EUR", period: "year" },
  }),
  offer("Other", "es", "Gurb", "ES511"),
  offer("Barry Callebaut", "es", "Gurb", "ES511"),
  offer("Barry Callebaut", "be", "Halle", "BE241"),
  offer("Barry Callebaut", "nl", "Zundert", "NL411"),
];
const registers: KeptRegisterCompany[] = [
  {
    id: "A1",
    name: "BARRY CALLEBAUT MANUFACTURING IBERICA, SAU",
    country: "es",
    nuts: "ES511",
    town: "Gurb",
    register: "diba",
    nace: "1082",
  },
  {
    id: "912345678",
    name: "SANDNES ELEKTRISKE AS",
    country: "no",
    nuts: "NO0A1",
    town: "Sandnes",
    people: 11,
    website: "www.sandnes-elektriske.no",
    register: "brreg",
    nace: "43210",
  },
];

describe("company cards (companies FR-8)", () => {
  const employers = barry();
  const cards = companyCards({
    employers,
    joined: withRegisters(employers, registers, offers),
    offers,
    groupOf,
  });

  it("says what an employer's offers say of it, and the register companies that belong to it", () => {
    expect(cards.get("barry callebaut")).toEqual({
      companies: [
        ["Barry Callebaut Manufacturing Iberica, SAU", "Gurb", "diba"],
      ],
      groups: [["engineers", 4]],
      families: [["2144", 4]],
      towns: [
        ["Lebbeke", "be", 1],
        ["Gurb", "es", 1],
        ["Halle", "be", 1],
      ],
      townCount: 4,
      pay: [40000, 50000, "EUR", "year", 1],
    });
  });

  it("gives a register company that belongs to an employer its activity, register, employer and offers in its town", () => {
    expect(
      cards.get(cardKey("BARRY CALLEBAUT MANUFACTURING IBERICA, SAU", "es")),
    ).toEqual({
      activity: "1082",
      register: "diba",
      employer: "Barry Callebaut",
      offersInTown: 1,
    });
  });

  it("gives a company that stands alone its activity's class, its people and its website", () => {
    expect(cards.get("no:sandnes elektriske")).toEqual({
      activity: "4321",
      register: "brreg",
      people: 11,
      website: "https://www.sandnes-elektriske.no",
    });
  });

  it("states the pay from the tenth lowest to the tenth highest, one slip left out, the modes, and one town however written", () => {
    const paid: DirectoryOffer[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        offer("Payco", "de", "Berlin", "DE300", {
          families: ["2512"],
          pay: {
            low: 30000 + i * 1000,
            high: 40000 + i * 1000,
            currency: "EUR",
            period: "year",
          },
          workMode: (["remote", "hybrid", "onsite"] as const)[i % 3] ?? null,
        }),
      ),
      offer("Payco", "de", "BERLIN", "DE300", {
        families: ["2512"],
        pay: { low: 3500, high: 4000, currency: "EUR", period: "month" },
      }),
      offer("Payco", "de", "Berlin", "DE300", {
        families: ["2512"],
        pay: { low: 300000, high: 400000, currency: "EUR", period: "year" },
      }),
    ];
    const payco = companyCards({
      employers: [
        {
          name: "Payco",
          count: 12,
          group: "software-it",
          places: { DE300: 12 },
          town: "Berlin",
          townNuts: "DE300",
        },
      ],
      joined: { same: new Map(), listed: [] },
      offers: paid,
      groupOf,
    }).get("payco");
    expect([payco?.pay, payco?.modes, payco?.towns, payco?.townCount]).toEqual([
      [31000, 49000, "EUR", "year", 12],
      [4, 3, 3],
      [["Berlin", "de", 12]],
      1,
    ]);
  });

  it("gives no card with nothing to say", () => {
    expect(
      companyCards({
        employers: [
          {
            name: "Quiet",
            count: 0,
            group: "",
            places: {},
            town: "",
            townNuts: "",
          },
        ],
        joined: { same: new Map(), listed: [] },
        offers: [],
      }).size,
    ).toBe(0);
  });
});
