import { describe, expect, it } from "vitest";
import {
  type DirectoryOffer,
  mainCountry,
  offersAt,
  updateCompanies,
} from "./directory.js";
import type { History } from "./history.js";

const GROUPS: Record<string, string> = {
  "2144": "engineers",
  "2151": "engineers",
  "2512": "software-it",
  "7411": "trades",
};
const groupOf = (family: string) => GROUPS[family] ?? "";

const offer = (
  employer: string,
  family: string,
  nuts: string | null,
  country: string,
  town: string,
): DirectoryOffer => ({ employer, families: [family], nuts, country, town });

// The legacy's own run of updateCompanies on the same history and offers gave these (2026-11-19).
function example() {
  const history: History = {
    "orsted a s": {
      n: "Ørsted A/S",
      g: "engineers",
      p: ["DK012"],
      t: "Fredericia",
      tn: "DK032",
      seen: "2026-11-01",
    },
    confidential: {
      n: "Confidential",
      g: "",
      p: ["es"],
      t: "",
      tn: "",
      seen: "2026-11-01",
    },
    "old gmbh": {
      n: "Old GmbH",
      g: "engineers",
      p: ["DE212"],
      t: "München",
      tn: "DE212",
      seen: "2026-11-01",
    },
    takenco: { n: "TakenCo", g: "", p: [], t: "", tn: "", seen: "2026-11-01" },
  };
  const offers = [
    offer("Siemens AG", "2144", "DE212", "de", "München"),
    offer("SIEMENS", "2151", "DE212", "de", "MÜNCHEN"),
    offer("Siemens AG", "2512", null, "es", ""),
    offer("Siemens AG", "7411", "ES511", "es", "Barcelona"),
    offer("Old GmbH", "2144", "DE300", "de", "Berlin"),
    offer("Confidencial", "2144", "ES300", "es", "Madrid"),
  ];
  const rows = updateCompanies(
    history,
    offers,
    groupOf,
    "2026-11-19",
    (name) => name === "TakenCo",
  );
  return { history, rows };
}

describe("the employers listed (companies FR-5)", () => {
  it("lists today's employers and those listed before, most offers first", () => {
    expect(example().rows).toEqual([
      {
        name: "Siemens AG",
        count: 4,
        group: "engineers",
        places: { DE212: 2, ES511: 1, es: 1 },
        town: "München",
        townNuts: "DE212",
      },
      {
        name: "Old GmbH",
        count: 1,
        group: "engineers",
        places: { DE212: 0, DE300: 1 },
        town: "Berlin",
        townNuts: "DE300",
      },
      {
        name: "Ørsted A/S",
        count: 0,
        group: "engineers",
        places: { DK012: 0 },
        town: "Fredericia",
        townNuts: "DK032",
      },
    ]);
  });

  it("moves an employer to the key the rules give now, and forgets no-names and takedowns", () => {
    const { history } = example();
    expect(Object.keys(history).toSorted()).toEqual([
      "old",
      "orsted",
      "siemens",
    ]);
    expect(history["siemens"]).toEqual({
      n: "Siemens AG",
      g: "engineers",
      p: ["DE212", "ES511", "es"],
      t: "München",
      tn: "DE212",
      seen: "2026-11-19",
    });
    expect(history["orsted"]?.seen).toBe("2026-11-01");
  });

  it("finds an employer's main country, Greek and British NUTS read as their ISO codes", () => {
    expect(mainCountry({ DE212: 2, es: 1, ES511: 1, EL301: 0, UK123: 3 })).toBe(
      "gb",
    );
  });

  it("knows where each employer has offers today", () => {
    const at = offersAt([
      offer("Siemens AG", "2144", "DE212", "de", "München"),
      offer("Siemens AG", "2144", null, "es", ""),
    ]);
    expect(at.get("siemens")).toEqual({
      towns: new Set(["de|munchen"]),
      places: new Set(["DE212"]),
      regions: new Set(["DE21"]),
    });
    expect(
      offersAt(
        [offer("Siemens AG", "2144", "DE212", "de", "München")],
        new Set(["abb"]),
      ).size,
    ).toBe(0);
  });
});
