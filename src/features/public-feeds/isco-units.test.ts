import { describe, expect, it } from "vitest";
import { loadIscoUnits } from "./isco-units.js";

describe("config/isco-units.yml (public-feeds FR-7)", () => {
  it("loads the 71 unit groups of the legacy scope", async () => {
    const units = await loadIscoUnits();
    expect(units.size).toBe(71);
    expect(units.has("2151")).toBe(true);
    expect(units.has("8322")).toBe(false);
  });
});
