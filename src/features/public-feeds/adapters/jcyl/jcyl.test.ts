import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { jcyl, parseJcyl } from "./jcyl.js";

describe("jcyl (public-feeds FR-1, FR-6)", () => {
  it("is ported disabled and flagged", () => {
    expect(jcyl.definition.disabledReason).toMatch(/robots\.txt closes/);
  });

  it("maps the documented format into valid adverts", async () => {
    expect(
      await checkAdapterContract(jcyl, await loadFixtureRoutes("jcyl")),
    ).toEqual([]);
  });

  it("reads the attribute lists, drops the raw control character and the contacts", async () => {
    // The made-up fixture has a raw 0x01 inside a text, as the legacy found in the real one.
    const text = await readFile(
      join(FIXTURES_DIRECTORY, "jcyl", "offers.json"),
      "utf8",
    );
    expect(() => JSON.parse(text)).toThrow(SyntaxError);
    const drafts = parseJcyl(text);
    // The offer with no address is left out.
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      "CYL-9001",
      "CYL-9002",
    ]);
    expect(drafts[0]).toMatchObject({
      title: "Oficial de primera electricista",
      city: "Valladolid",
      location: "Valladolid, Valladolid, España",
      posted: "2026-11-10",
      url: "https://empleo.jcyl.example/oferta/CYL-9001",
    });
    expect(drafts[0]?.description).toBe(
      "Se precisa electricista para obras en Valladolid.\nContacto: , .",
    );
  });
});
