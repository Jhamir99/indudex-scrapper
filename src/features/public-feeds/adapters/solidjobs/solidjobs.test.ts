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
import { pageUrl, parseSolid, solidjobs } from "./solidjobs.js";

const fixture = (name: string) =>
  readFile(
    new URL(`../../../../../test/fixtures/solidjobs/${name}`, import.meta.url),
    "utf8",
  );

const jobs = (count: number, totalPages: number, from = 0) =>
  JSON.stringify({
    totalPages,
    jobs: Array.from({ length: count }, (_, k) => ({
      jobOfferKey: `k${from + k}`,
      title: `Inżynier ${from + k}`,
      url: `https://solid.jobs/o/${from + k}/indudex`,
      locations: ["Kraków"],
    })),
  });

describe("solidjobs (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        solidjobs,
        await loadFixtureRoutes("solidjobs"),
      ),
    ).toEqual([]);
  });

  it("maps an offer's fields and its work mode", async () => {
    const { drafts } = parseSolid(await fixture("it-page-0.json"));
    expect(drafts[0]).toMatchObject({
      source: "solidjobs",
      title: "Penetration Tester",
      location: "Warszawa, Polska",
      country: "pl",
      city: "Warszawa",
      remote: false,
      workMode: "hybrid",
      expires: "2026-12-17",
      language: "pl",
    });
    expect(drafts[0]?.url).toMatch(/^https:\/\/solid\.jobs\/o\//);
  });

  it("reads every page of both divisions", async () => {
    const http = new FakeHttpClient({
      [pageUrl("IT", 0)]: jobs(2, 2),
      [pageUrl("IT", 1)]: jobs(2, 2, 2),
      [pageUrl("Engineering", 0)]: jobs(1, 1, 4),
    });
    const drafts = await readDrafts(solidjobs, fakeContext({ http }));
    expect(drafts).toHaveLength(5);
    expect(http.requests[0]?.options).toEqual({
      headers: { accept: "application/json" },
    });
  });

  it("fails past its page ceiling and on an empty answer", async () => {
    const tooMany = new FakeHttpClient({ [pageUrl("IT", 0)]: jobs(1, 101) });
    await expect(
      readDrafts(solidjobs, fakeContext({ http: tooMany })),
    ).rejects.toThrow("IT runs to 101 pages, past 100");
    const empty = new FakeHttpClient({
      [pageUrl("IT", 0)]: jobs(0, 1),
      [pageUrl("Engineering", 0)]: jobs(0, 1),
    });
    await expect(
      readDrafts(solidjobs, fakeContext({ http: empty })),
    ).rejects.toThrow("the feed holds no advert");
  });
});
