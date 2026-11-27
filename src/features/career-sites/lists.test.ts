import { describe, expect, it } from "vitest";
import { boardOf, platformOn, readCareerLists } from "./lists.js";

// The legacy's own counts at JustJans/indudex@ec79858 (its `loadSites` and `loadCompanies`, the job-board hosts aside:
// they leave out two more sites).
describe("the career sites' lists (career sites FR-1)", () => {
  const lists = readCareerLists();

  it("gathers every list as the legacy does, each address or slug once, the hand-kept first", () => {
    expect([
      lists.allSites.length,
      lists.allSites.filter((site) => !site.found).length,
      lists.sites.length,
      lists.allSites.filter((site) => site.enabled === false).length,
    ]).toEqual([14_961, 504, 11_006, 17]);
    expect([
      lists.allCompanies.length,
      lists.allCompanies.filter((company) => !company.found).length,
      lists.companies.length,
      lists.allCompanies.filter((company) => company.enabled === false).length,
    ]).toEqual([11_273, 84, 10_700, 18]);
  });

  it("reads a platform unless vendors.yml switches it off, a vendor only when it switches it on", () => {
    expect(
      ["greenhouse", "smartrecruiters", "workday", "oracle"].map((platform) =>
        platformOn(platform, lists.vendors),
      ),
    ).toEqual([true, false, true, true]);
    expect(platformOn("workday", {})).toBe(false);
    expect(lists.sites.some((site) => site.platform === "join")).toBe(false);
  });

  it("names each board by its platform and slug", () => {
    expect(
      boardOf({ name: "Vattenfall", smartrecruiters: "vattenfall" }),
    ).toEqual({ platform: "smartrecruiters", slug: "vattenfall" });
    expect(boardOf({ name: "Nothing" })).toBeUndefined();
  });

  it("leaves out a site the careers reader takes for a job board", () => {
    const one = lists.sites[0]!;
    const without = readCareerLists({
      isBoardHost: (site) => site === one || site.host === one.host,
    });
    expect(without.sites.length).toBeLessThan(lists.sites.length);
  });
});
