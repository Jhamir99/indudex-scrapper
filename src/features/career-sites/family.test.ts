import { describe, expect, it } from "vitest";
import { countryNames } from "../../shared/catalogues/country-names.js";
import { boardDeadline } from "./family.js";
import {
  boardSourceId,
  careerAdapters,
  careerDraft,
  siteSourceId,
} from "./index.js";
import { countryOfRaw } from "./family.js";

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

describe("a pass's time and group (career sites FR-6, FR-7)", () => {
  it("sizes a board's time by the vacancies it held, as the legacy's sizedDeadline, up to 25 minutes", () => {
    expect([
      boardDeadline("greenhouse", false, 0),
      boardDeadline("greenhouse", true, 0),
      boardDeadline("workday", true, 0),
      boardDeadline("manatal", true, 0),
      boardDeadline("workday", false, 599),
      boardDeadline("workday", false, 10),
      boardDeadline("workday", false, 5000),
    ]).toEqual([
      300_000, 120_000, 300_000, 400_000, 499_650, 300_000, 1_500_000,
    ]);
  });

  it("puts JOIN's companies in a group of their own, and gives a site the legacy's time", () => {
    const all = careerAdapters();
    const join = all.find((one) => one.group === "join");
    expect(join?.definition.id).toMatch(/^careers\./);
    const site = all.find(
      (one) => one.definition.id.startsWith("careers.") && !one.group,
    );
    expect([400_000, 900_000]).toContain(site?.deadlineMs?.({ adverts: 0 }));
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
      countryOfRaw({}, names),
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

  it("reads the country as the legacy's processor did, its stated one weighed in, and marks one it cannot read", () => {
    const asked: unknown[] = [];
    const countryOf = countryOfRaw(
      {
        countryOf: (advert) => {
          asked.push(advert);
          return {
            country: /San Francisco/.test(advert.location ?? "")
              ? "us"
              : (advert.country ?? ""),
            town: "",
          };
        },
      },
      undefined,
    );
    const draft = (location: string, country?: string) =>
      careerDraft(
        {
          source: "x",
          url: "https://boards.example.com/1",
          title: "Field Engineer",
          location,
          mode: "On-site",
          ...(country ? { country } : {}),
        },
        "greenhouse.x",
        countryOf,
      );
    expect(
      [draft("San Francisco"), draft("Somewhere"), draft("Lyon", "FR")].map(
        (one) => [one?.country, one?.language],
      ),
    ).toEqual([
      ["us", "en"],
      ["zz", "en"],
      ["fr", "fr"],
    ]);
    expect(asked[2]).toMatchObject({ country: "fr", mode: "onsite" });
  });

  it("leaves out an advert with no https address or no title", () => {
    expect([
      careerDraft(
        { source: "x", url: "http://jobs.example.de/1", title: "Elektriker" },
        "careers.x",
        () => "",
      ),
      careerDraft(
        { source: "x", url: "https://jobs.example.de/1", title: " " },
        "careers.x",
        () => "",
      ),
    ]).toEqual([undefined, undefined]);
  });
});
