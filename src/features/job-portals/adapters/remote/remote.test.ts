import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import { countryNames } from "../../../../shared/catalogues/country-names.js";
import {
  arbeitnow,
  countryOfPlace,
  jobicy,
  parseArbeitnow,
  parseJobicy,
  parseRemotive,
  remotive,
} from "./remote.js";

const names = await countryNames();

describe("the remote boards (job portals FR-6)", () => {
  it("map their saved answers into valid adverts", async () => {
    for (const adapter of [jobicy, arbeitnow, remotive])
      expect(
        await checkAdapterContract(
          adapter,
          await loadFixtureRoutes(adapter.definition.id),
        ),
      ).toEqual([]);
  });

  it("pass the legacy's own cases (test/builder.test.mjs)", () => {
    const [jb] = parseJobicy(
      {
        jobs: [
          {
            id: 151870,
            url: "https://jobicy.com/jobs/151870-x",
            jobTitle: "DevOps Engineer",
            companyName: "Alma",
            jobGeo: "Italy",
            jobExcerpt: "Short.",
            jobDescription: "<p>Long &amp; full.</p>",
            pubDate: "2026-09-06T06:05:03+00:00",
          },
        ],
      },
      names,
    ).drafts;
    expect([
      jb?.title,
      jb?.location,
      jb?.remote,
      jb?.description,
      jb?.posted,
      jb?.url,
    ]).toEqual([
      "DevOps Engineer",
      "Italy",
      true,
      "Long & full.",
      "2026-09-06",
      "https://jobicy.com/jobs/151870-x",
    ]);
    const { drafts, unplaced } = parseRemotive(
      {
        jobs: [
          {
            id: 9,
            url: "https://remotive.com/remote-jobs/software-dev/x-9",
            title: "Backend Engineer",
            company_name: "Acme",
            candidate_required_location: "Europe",
            publication_date: "2026-09-04T10:00:00",
            description: "<p>Body</p>",
          },
        ],
      },
      names,
    );
    // The legacy kept it with "Europe" as its place, under "Remote"; the store needs a country (tasks.md, T008).
    expect([drafts, unplaced]).toEqual([[], 1]);
    const [ab] = parseArbeitnow(
      {
        data: [
          {
            slug: "x-1",
            company_name: "Superchat",
            title: "Tech Lead (m/f/d)",
            description:
              "&lt;p&gt;We&#39;re &lt;strong&gt;hiring&lt;/strong&gt;.&lt;/p&gt;",
            remote: false,
            url: "https://www.arbeitnow.com/jobs/companies/superchat/x-1",
            location: "Berlin",
            created_at: Date.UTC(2026, 8, 5, 12) / 1000,
          },
        ],
      },
      names,
    );
    expect([
      ab?.title,
      ab?.company,
      ab?.location,
      ab?.description,
      ab?.posted,
      ab?.language,
      ab?.country,
    ]).toEqual([
      "Tech Lead (m/f/d)",
      "Superchat",
      "Berlin",
      "We're hiring.",
      "2026-09-05",
      "de",
      "de",
    ]);
  });

  it("read a country's name, a big town where a board writes towns, and leave a region without one", () => {
    expect([
      countryOfPlace("Spain, Portugal", names),
      countryOfPlace("UK", names),
      countryOfPlace("EMEA", names),
      countryOfPlace("London", names, true),
      countryOfPlace("Kleinkleckersdorf", names, true),
    ]).toEqual(["es", "gb", undefined, "gb", undefined]);
  });

  it("reads Arbeitnow's pages until one is empty", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("arbeitnow"));
    const drafts = await readDrafts(
      arbeitnow,
      fakeContext({ http, today: "2026-11-26" }),
    );
    expect(http.requests.map((request) => request.url)).toEqual([
      "https://www.arbeitnow.com/api/job-board-api?page=1",
      "https://www.arbeitnow.com/api/job-board-api?page=2",
    ]);
    expect(drafts).toHaveLength(5);
  });

  it("ports Remotive switched off: its robots.txt closes the API", () => {
    expect(remotive.definition.disabledReason).toMatch(/robots\.txt/);
  });
});
