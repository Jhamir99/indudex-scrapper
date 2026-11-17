import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeLanbide, lanbide, parseLanbide } from "./lanbide.js";

// test/fixtures/lanbide/offers.json is built from the format the legacy documents (the file was
// never read here: robots.txt closes it), in Windows-1252 as Lanbide serves it.
const bytes = async () =>
  new Uint8Array(
    await readFile(join(FIXTURES_DIRECTORY, "lanbide", "offers.json")),
  );

describe("lanbide (public-feeds FR-1, FR-6)", () => {
  it("is ported disabled and flagged", () => {
    expect(lanbide.definition.disabledReason).toMatch(/robots\.txt closes/);
  });

  it("maps the documented format into valid adverts", async () => {
    expect(
      await checkAdapterContract(lanbide, await loadFixtureRoutes("lanbide")),
    ).toEqual([]);
  });

  it("decodes Windows-1252, and UTF-8 when the file is UTF-8", async () => {
    expect(decodeLanbide(await bytes())).toContain("Araba/Álava");
    expect(decodeLanbide(new TextEncoder().encode("Álava"))).toBe("Álava");
  });

  it("maps an offer: its town and province, its text without contacts, its day", async () => {
    const drafts = parseLanbide(decodeLanbide(await bytes()));
    // An offer whose address is not https is left out.
    expect(drafts.map((draft) => draft.sourceId)).toEqual(["ODE-1001", "1002"]);
    expect(drafts[0]).toMatchObject({
      title: "Electricista industrial",
      company: "",
      city: "Bilbao",
      location: "Bilbao, Bizkaia, España",
      country: "es",
      language: "es",
      posted: "2026-11-10",
      url: "https://www.lanbide.euskadi.eus/ofertas/ODE-1001",
    });
    expect(drafts[0]?.description).toBe(
      "Se necesita electricista con experiencia en cuadros y automatización. Contrato indefinido. Enviar CV a o llamar al .",
    );
    // No publication day: the day it was modified.
    expect(drafts[1]).toMatchObject({
      posted: "2026-11-13",
      location: "Vitoria-Gasteiz, Araba/Álava, España",
    });
  });
});
