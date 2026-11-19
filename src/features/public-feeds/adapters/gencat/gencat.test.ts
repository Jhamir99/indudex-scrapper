import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { gencat, parseGencat } from "./gencat.js";

describe("gencat (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(gencat, await loadFixtureRoutes("gencat")),
    ).toEqual([]);
  });

  it("maps a post: as the dataset writes it, its body, its territory's town, its days and its PDF", async () => {
    const drafts = parseGencat(
      await readFile(join(FIXTURES_DIRECTORY, "gencat", "offers.json"), "utf8"),
    );
    // The post outside Catalonia (a delegate in Japan) is left out.
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      "ACA047-26",
      "EDF857626",
      "EMT675-26",
    ]);
    expect(drafts[0]).toMatchObject({
      title: "Tècnic/a Superior Especialista, Grup VII",
      company: "Agència Catalana de l'Aigua",
      city: "Barcelona",
      location: "Barcelona, Catalunya, España",
      country: "es",
      language: "ca",
      posted: "2026-11-03",
      expires: "2026-11-17",
      url: "https://documents.dadesobertes.gencat.cat/ofertes-treball/docs/2/132111.pdf",
      contract: "temporal",
    });
    expect(drafts[0]?.description).toBe(
      "Tècnic/a Superior Especialista, Grup VII\nAgència Catalana de l'Aigua\nDepartament: TERRITORI, HABITATGE I TRAN.EC\nCategoria: Sector públic i altres\nÀmbit: Comarques de Barcelona\nContracte: temporal",
    );
    expect(drafts[1]?.city).toBe("Lleida");
  });
});
