import { readFile } from "node:fs/promises";
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
import { brz } from "./brz.js";

const FEED = "https://www.brz-jobs.at/Syndication/Xml?referrer=BRZ%20Portal";

describe("brz (public-feeds FR-1, FR-3)", () => {
  it("maps the saved feed into valid adverts", async () => {
    expect(
      await checkAdapterContract(brz, await loadFixtureRoutes("brz")),
    ).toEqual([]);
  });

  it("maps each job's fields", async () => {
    const xml = await readFile(
      new URL("../../../../../test/fixtures/brz/feed.xml", import.meta.url),
      "utf8",
    );
    const http = new FakeHttpClient({ [FEED]: xml });
    const drafts = await readDrafts(brz, fakeContext({ http }));

    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({
      source: "brz",
      sourceId: "3265",
      title: "Solution Manager (w/m/d) Infrastrukturlösungen",
      company: "Bundesrechenzentrum",
      location: "Wien, Österreich",
      country: "at",
      city: "Wien",
      remote: false,
      url: "https://www.brz-jobs.at/job/3265?referrer=BRZ+Portal",
      posted: "2026-04-03",
      language: "de",
    });
    expect(drafts[0]?.description).toMatch(
      /^Vollzeit - ab sofort - unbefristet - Home Office 60 % - Deutsch C1\n/,
    );
    expect(drafts[0]?.description).not.toContain("<");
  });

  it("reports an empty or changed answer as a failure", async () => {
    for (const body of [
      '<?xml version="1.0"?><jobs></jobs>',
      "<html><body>Wartung</body></html>",
    ]) {
      const problems = await checkAdapterContract(brz, {
        [FEED]: body,
      });
      expect(problems).toEqual([
        "fixture read: failed the feed holds no advert",
      ]);
    }
  });
});
