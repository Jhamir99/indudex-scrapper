import { describe, expect, it } from "vitest";
import { countryNames } from "../../shared/catalogues/country-names.js";
import {
  boardSourceId,
  careerAdapters,
  careerDraft,
  siteSourceId,
} from "./index.js";

describe("one source per entry (career sites FR-1, FR-12)", () => {
  it("names a site by its legacy key and a board by its platform and slug, as a source id may be written", () => {
    expect([
      siteSourceId({ host: "careers.roche.com" }),
      siteSourceId({ sitemap: "https://careers.vanoord.com/sitemap.xml" }),
      boardSourceId("workday", "equinor.wd3/EQNR"),
      boardSourceId("teamtailor", "https://careers.sorigue.com"),
    ]).toEqual([
      "careers.careers.roche.com",
      expect.stringMatching(/^careers\.careers\.vanoord\.com-[0-9a-f]{6}$/),
      "workday.equinor.wd3-eqnr",
      "teamtailor.https-careers.sorigue.com",
    ]);
  });

  it("makes the legacy's sources: 10,867 sites and 10,682 boards read, the rest listed off with their reason", () => {
    const all = careerAdapters();
    const on = all.filter((one) => !one.definition.disabledReason);
    expect([
      on.filter((one) => one.definition.id.startsWith("careers.")).length,
      on.filter((one) => !one.definition.id.startsWith("careers.")).length,
    ]).toEqual([10_867, 10_682]);
    expect(
      new Set(
        all
          .map((one) => one.definition.disabledReason)
          .filter(Boolean)
          .map((reason) => reason!.split(" ")[0]),
      ),
    ).toEqual(new Set(["smartrecruiters", "join", "paused", "a"]));
  });
});

describe("a reader's advert as the store keeps it", () => {
  it("keeps an https advert, its country read from its place when it states none", async () => {
    const names = await countryNames();
    const draft = careerDraft(
      {
        source: "careers",
        url: "https://jobs.example.de/stelle/1",
        title: " Elektriker (m/w/d) ",
        location: "München, Deutschland",
        mode: "hybrid",
        codes: { isco: "7411" },
        contract: "Unbefristet",
        employmentType: ["FULL_TIME"],
      },
      "careers.jobs.example.de",
      names,
    );
    expect(draft).toMatchObject({
      source: "careers.jobs.example.de",
      sourceId: "https://jobs.example.de/stelle/1",
      title: "Elektriker (m/w/d)",
      country: "de",
      language: "de",
      workMode: "hybrid",
      remote: false,
      occupationCodes: { isco: "7411" },
      contract: "Unbefristet",
      employmentType: ["FULL_TIME"],
    });
  });

  it("leaves out an advert with no https address or no title", () => {
    expect([
      careerDraft(
        { source: "x", url: "http://jobs.example.de/1", title: "Elektriker" },
        "careers.x",
        undefined,
      ),
      careerDraft(
        { source: "x", url: "https://jobs.example.de/1", title: " " },
        "careers.x",
        undefined,
      ),
    ]).toEqual([undefined, undefined]);
  });
});
