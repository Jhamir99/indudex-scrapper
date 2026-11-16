import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { brandenburg, dayInBerlin, parseBrandenburg } from "./brandenburg.js";

describe("brandenburg (public-feeds FR-1)", () => {
  it("maps the saved list into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        brandenburg,
        await loadFixtureRoutes("brandenburg"),
      ),
    ).toEqual([]);
  });

  it("maps an offer: the German town name, its days in Berlin, no closing day for a standing call", () => {
    const [dated, standing] = parseBrandenburg(
      JSON.stringify([
        {
          id: 13448,
          title: "Amtlicher Tierarzt (m/w/d)",
          city: "Forst (Lausitz)/Baršć (Łužyca)",
          employer: "Landkreis Spree-Neiße",
          onlineDate: 1616367600,
          vacancyDate: 1798671600,
        },
        { id: 2, title: "Ingenieur", onlineDate: 1763247600, vacancyDate: "0" },
      ]),
    );
    expect(dated).toMatchObject({
      sourceId: "13448",
      city: "Forst (Lausitz)",
      location: "Forst (Lausitz), Brandenburg, Deutschland",
      company: "Landkreis Spree-Neiße",
      url: "https://karriere-in-brandenburg.de/stellenangebote/13448",
      posted: "2021-03-22",
      expires: "2026-12-31",
    });
    expect(standing?.expires).toBeUndefined();
  });

  it("takes the day as it is in Berlin", () => {
    // 2025-11-15T23:30:00Z is already the 16th in Berlin.
    expect(dayInBerlin(1763249400)).toBe("2025-11-16");
    expect(dayInBerlin("0")).toBeUndefined();
  });
});
