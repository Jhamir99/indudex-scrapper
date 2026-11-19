import { describe, expect, it } from "vitest";
import { gateCatalogues } from "../../../test/gate/catalogues.js";
import { compileGate } from "./compile.js";
import { TITLES as T } from "./title-rules.js";
import { BLOCKERS } from "./words.js";

const catalogues = await gateCatalogues();
const started = performance.now();
const gate = compileGate(catalogues);
const compileMs = performance.now() - started;

const found = (language: string, title: string) =>
  T.find(gate.main.index.get(language) ?? T.index({}), T.clean(title));

describe("the compiled gate (gate FR-1, FR-2)", () => {
  it("splits the 71 families into the main occupations and the trades", () => {
    expect(gate.main.ids.size + (gate.optional?.ids.size ?? 0)).toBe(71);
    expect(gate.main.ids.has("2144")).toBe(true);
    expect(gate.optional?.ids.has("7231")).toBe(true);
    expect(gate.main.ids.has("7231")).toBe(false);
    expect([gate.main.genericFamily, gate.main.ictFamily]).toEqual([
      "2149",
      "2519",
    ]);
  });

  it("finds every family back by its ISCO unit group", () => {
    for (const family of catalogues.families.families)
      for (const code of family.isco)
        expect(
          gate.main.byIsco.get(code) ?? gate.optional?.byIsco.get(code),
        ).toBe(family.id);
  });

  it("reads an SSYK concept into every family of its ISCO groups in the vertical", () => {
    const several = [...gate.main.bySsyk.values()].filter(
      (ids) => ids.length > 1,
    );
    expect(several.length).toBeGreaterThan(0);
    for (const [id, ids] of gate.main.bySsyk)
      expect(ids).toEqual([
        ...new Set(
          catalogues.ssykIsco.concepts[id]?.isco.flatMap((code) => {
            const family = gate.main.byIsco.get(code);
            return family ? [family] : [];
          }),
        ),
      ]);
  });

  it("indexes the titles of each family and the titles outside, never a bare role word", () => {
    expect(found("en", "mechanical engineer").get("2144")).toEqual([
      "mechanical engineer",
    ]);
    expect(found("es", "ingeniero mecánico").get("2144")).toEqual([
      "ingeniero mecanico",
    ]);
    expect(found("en", "marketing specialist").get(BLOCKERS)).toEqual([
      "marketing specialist",
    ]);
    expect(found("en", "technician").size).toBe(0);
    expect(found("es", "coordinador").size).toBe(0);
  });

  it("keeps the confirmed titles by their matchable form", () => {
    expect(gate.confirmed.size).toBe(
      Object.keys(catalogues.confirmedTitles.titles).length,
    );
  });

  it("compiles in under five seconds", () => {
    expect(compileMs).toBeLessThan(5000);
  });
});
