import { describe, expect, it } from "vitest";
import { loadConfig } from "../../shared/config/load-config.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { IscoUnits } from "./isco-units.js";
import { loadSsykGroups } from "./adapters/jobtech/ssyk-groups.js";

const byConcept = (a: { concept: string }, b: { concept: string }) =>
  a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0;

// The scope lists in config/ were built from the catalogues: they must still agree (catalogues FR-8).
describe("scope lists and catalogues", () => {
  it("name the same ISCO-08 unit groups as the families, the trades optional in both", async () => {
    const { units } = await loadConfig("isco-units.yml", IscoUnits);
    const { groups, families } = await readCatalogue("families");
    const optionalGroups = new Set(
      groups.filter((group) => group.optional).map((group) => group.id),
    );
    expect(
      units.map((unit) => [unit.isco, unit.optional ?? false]).toSorted(),
    ).toEqual(
      families
        .map((family) => [family.id, optionalGroups.has(family.group)])
        .toSorted(),
    );
  });

  it("ask jobtech for every SSYK group of JobTech's correspondence in the scope, with its codes in the scope", async () => {
    const { groups } = await loadSsykGroups();
    const { concepts } = await readCatalogue("ssykIsco");
    const { families } = await readCatalogue("families");
    const scope = new Set(families.map((family) => family.id));
    const expected = Object.entries(concepts)
      .map(([concept, { ssyk, isco }]) => ({
        concept,
        ssyk,
        isco: isco.filter((unit) => scope.has(unit)).toSorted(),
      }))
      .filter((group) => group.isco.length > 0);
    const listed = groups.map(({ concept, ssyk, isco }) => ({
      concept,
      ssyk,
      isco: isco.toSorted(),
    }));
    expect(listed.toSorted(byConcept)).toEqual(expected.toSorted(byConcept));
  });
});
