import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { feinaactiva, parseFeinaActiva, publicUrl } from "./feinaactiva.js";

describe("feinaactiva (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        feinaactiva,
        await loadFixtureRoutes("feinaactiva"),
      ),
    ).toEqual([]);
  });

  it("maps an ad: its page on the public site, its place as names, its pay and hours as lines", async () => {
    const drafts = parseFeinaActiva(
      await readFile(
        join(FIXTURES_DIRECTORY, "feinaactiva", "offers.xml"),
        "utf8",
      ),
    );
    // The closed ad is left out.
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      expect.stringMatching(/^FA/),
      expect.stringMatching(/^FA/),
      "FA90000001",
    ]);
    const made = drafts.at(-1);
    expect(made).toMatchObject({
      title: "Electricista",
      company: "Empresa Exemple, S.L.",
      city: "Sant Cugat Del Vallès",
      location: "Sant Cugat Del Vallès, Barcelona, España",
      country: "es",
      language: "ca",
      posted: "2026-11-10",
      url: "https://feinaactiva.gencat.cat/ca/search/offers/detail/FA90000001",
      description:
        "Instal·lacions elèctriques.\nContracte: Contracte laboral indefinit\nJornada: Jornada parcial (20 hores - jornada setmanal)\nSalari mensual brut des de 1200",
      contract: "Contracte laboral indefinit",
      hours: "Jornada parcial (20 hores - jornada setmanal)",
    });
  });

  it("gives the public page of an address from a developer's machine, or from the id", () => {
    expect(
      publicUrl("http://localhost:4200/search/offers/detail/FA1?x=1", "FA1"),
    ).toBe("https://feinaactiva.gencat.cat/ca/search/offers/detail/FA1");
    expect(publicUrl("", "FA2")).toBe(
      "https://feinaactiva.gencat.cat/ca/search/offers/detail/FA2",
    );
    expect(publicUrl("", "")).toBe("");
  });
});
