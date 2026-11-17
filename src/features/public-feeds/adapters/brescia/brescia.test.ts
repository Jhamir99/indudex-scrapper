import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { brescia, cardDay, parseBrescia } from "./brescia.js";

describe("brescia (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(brescia, await loadFixtureRoutes("brescia")),
    ).toEqual([]);
  });

  it("maps a card: its number, title, town, day and text", async () => {
    const drafts = parseBrescia(
      await readFile(
        join(FIXTURES_DIRECTORY, "brescia", "offers.html"),
        "utf8",
      ),
    );
    expect(drafts).toHaveLength(4);
    const receptionist = drafts.find((draft) => draft.sourceId === "43073");
    expect(receptionist).toMatchObject({
      title: "Receptionist per Camping",
      company: "",
      city: "Desenzano del Garda",
      location: "Desenzano del Garda, Italia",
      country: "it",
      language: "it",
      posted: "2026-11-17",
      url: "https://lavoro.provincia.brescia.it/offerte-di-lavoro-e-formazione/dettaglio-offerta/43073/",
    });
    expect(receptionist?.description).toMatch(
      /^Camping Village di Desenzano d\/G cerca n\.6 Receptionist/,
    );
  });

  it("reads its days in both its forms, and no placeholder day", () => {
    expect(cardDay("Tue Nov 17 08:30:00 CET 2026")).toBe("2026-11-17");
    expect(cardDay("Sun Aug 02 10:00:00 CEST 2026")).toBe("2026-08-02");
    expect(cardDay("17-Nov-2026")).toBe("2026-11-17");
    expect(cardDay("2-Aug-2026")).toBe("2026-08-02");
    expect(cardDay("Thu Oct 23 10:17:00 CET 1969")).toBe(undefined);
    expect(cardDay("17/11/2026")).toBe(undefined);
  });
});
