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
import {
  categoryPage,
  jobindex,
  parseJobindex,
  resultsOf,
} from "./jobindex.js";

const page = () =>
  readFile(
    new URL(
      "../../../../../test/fixtures/jobindex/supid-1.html",
      import.meta.url,
    ),
    "utf8",
  );

describe("jobindex (public-feeds FR-1, FR-4)", () => {
  it("maps the saved category page into valid adverts", async () => {
    expect(
      await checkAdapterContract(jobindex, await loadFixtureRoutes("jobindex")),
    ).toEqual([]);
  });

  it("maps each result's fields", async () => {
    const [first, , third] = parseJobindex(await page());

    expect(first).toMatchObject({
      source: "jobindex",
      sourceId: "h1716961",
      title: "Senior Domænearkitekt",
      company: "Bankdata",
      location: "Aarhus N, Danmark",
      country: "dk",
      city: "Aarhus N",
      url: "https://www.jobindex.dk/vis-job/h1716961",
      posted: "2026-11-16",
      expires: "2026-12-13",
      language: "da",
    });
    expect(first?.description).toMatch(/^Vil du bruge din erfaring/m);
    expect(first?.description).not.toContain("Vis interesse");
    expect(third?.city).not.toBe("");
  });

  it("reads the ten category pages and skips one that fails", async () => {
    const body = await page();
    const http = new FakeHttpClient({
      [categoryPage(1)]: body,
      [categoryPage(2)]: body,
    });

    const drafts = await readDrafts(jobindex, fakeContext({ http }));

    expect(http.requests.map((request) => request.url)).toEqual(
      Array.from({ length: 10 }, (_, index) => categoryPage(index + 1)),
    );
    expect(drafts).toHaveLength(3);
  });

  it("reports a page without results as a failure", async () => {
    const http = new FakeHttpClient({
      [categoryPage(1)]: "<html>Vedligeholdelse</html>",
    });

    await expect(readDrafts(jobindex, fakeContext({ http }))).rejects.toThrow(
      "the feed holds no advert",
    );
  });

  it("reads the results array whole, whatever its strings hold", () => {
    const html = `<script>x = {"results":[{"tid":"a","headline":"Ingeniør ] } [ \\" {"}],"next":1}</script>`;
    expect(resultsOf(html)).toEqual([
      { tid: "a", headline: 'Ingeniør ] } [ " {' },
    ]);
    expect(resultsOf("<html></html>")).toEqual([]);
  });
});
