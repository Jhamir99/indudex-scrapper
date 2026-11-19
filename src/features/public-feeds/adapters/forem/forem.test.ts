import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import { forem, parseForem } from "./forem.js";

describe("forem (public-feeds FR-1, FR-6)", () => {
  it("is ported disabled and flagged", () => {
    expect(forem.definition.disabledReason).toMatch(/robots\.txt closes/);
  });

  it("maps the documented format into valid adverts", async () => {
    expect(
      await checkAdapterContract(forem, await loadFixtureRoutes("forem")),
    ).toEqual([]);
  });

  it("maps an offer: its first town as a name, its facts and the languages it asks", async () => {
    const drafts = parseForem(
      await readFile(join(FIXTURES_DIRECTORY, "forem", "export.json"), "utf8"),
    );
    // Without an address the offer is left out.
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      "9123456",
      "9123457",
      "9100001",
    ]);
    expect(drafts[0]).toMatchObject({
      title: "ELECTRICIEN INDUSTRIEL (H/F/X)",
      company: "Entreprise Exemple SA",
      city: "Charleroi",
      location: "Charleroi, Belgique",
      country: "be",
      language: "fr",
      posted: "2026-11-10",
      expires: "2040-12-31",
      url: "https://www.leforem.be/particuliers/offre-emploi-9123456.html",
      description:
        "Electricien industriel · CDI · Temps plein · Langues: fr, nl",
      contract: "CDI",
      hours: "Temps plein",
    });
    expect(drafts[1]).toMatchObject({
      sourceId: "9123457",
      company: "",
      city: "Liège",
    });
  });

  it("leaves out the offers that closed before the run's day", async () => {
    const drafts = await readDrafts(
      forem,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("forem")),
        today: "2026-11-17",
      }),
    );
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      "9123456",
      "9123457",
    ]);
  });
});
