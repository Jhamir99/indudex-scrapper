import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { ooe, parseOoe } from "./ooe.js";

describe("ooe (public-feeds FR-1)", () => {
  it("maps the saved answer into valid adverts", async () => {
    expect(
      await checkAdapterContract(ooe, await loadFixtureRoutes("ooe")),
    ).toEqual([]);
  });

  it("maps a call: its own title, the unit, the town, the text without contacts", () => {
    const [draft] = parseOoe(
      JSON.stringify([
        {
          id: 3236,
          ausschreibungsTitel:
            "Bautechnikerin oder Bautechniker<br/>GZ 26 0530",
          job: {
            titel: "Technischer Dienst",
            dienstort: "Linz",
            dienststelle: "Abteilung Hochbau",
          },
          arbeitszeit: "Vollzeit",
          voraussetzung: "<p>HTL Bautechnik</p>",
          zusatzInfo: "Fragen an office@ooe.gv.at",
          beginnAusschreibung: "2026-11-10",
          bewerbungsfrist: "2026-12-01T00:00:00",
        },
      ]),
    );
    expect(draft).toMatchObject({
      sourceId: "3236",
      title: "Bautechnikerin oder Bautechniker",
      company: "Land Oberösterreich, Abteilung Hochbau",
      location: "Linz, Oberösterreich, Österreich",
      url: "https://www.land-oberoesterreich.gv.at/525548.htm#/3236",
      description: "Vollzeit\nHTL Bautechnik\nFragen an",
      posted: "2026-11-10",
      expires: "2026-12-01",
    });
  });
});
