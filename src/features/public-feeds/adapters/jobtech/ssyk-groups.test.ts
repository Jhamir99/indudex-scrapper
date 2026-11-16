import { describe, expect, it } from "vitest";
import { loadSsykGroups } from "./ssyk-groups.js";

describe("config/ssyk-groups.yml (public-feeds FR-7)", () => {
  it("loads a non-empty list of JobTech concepts, each once", async () => {
    const { groups } = await loadSsykGroups();
    expect(groups.length).toBeGreaterThan(0);
    const concepts = groups.map((group) => group.concept);
    expect(new Set(concepts).size).toBe(concepts.length);
  });

  it("keeps the engineers' groups", async () => {
    const { groups } = await loadSsykGroups();
    expect(groups.find((group) => group.ssyk === "2143")).toMatchObject({
      concept: "SPYW_7Z1_ShT",
      isco: ["2151", "2152", "2153"],
    });
  });
});
