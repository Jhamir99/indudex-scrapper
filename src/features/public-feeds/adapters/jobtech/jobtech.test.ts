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
import { jobtech, parseSearch, searchUrl } from "./jobtech.js";
import { loadSsykGroups } from "./ssyk-groups.js";

const fixture = () =>
  readFile(
    new URL(
      "../../../../../test/fixtures/jobtech/electrical-engineers.json",
      import.meta.url,
    ),
    "utf8",
  );

const hits = (from: number, count: number) =>
  Array.from({ length: count }, (_, k) => ({
    id: from + k,
    headline: `Ingenjör ${from + k}`,
  }));

const contractHit = (duration: string) =>
  parseSearch(
    JSON.stringify({
      total: { value: 1 },
      hits: [
        {
          id: 2,
          headline: "Elingenjör",
          employment_type: { label: "Vanlig anställning" },
          duration: { label: duration },
          working_hours_type: { label: "Heltid" },
        },
      ],
    }),
  ).drafts[0];

describe("jobtech (public-feeds FR-1, FR-7)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(jobtech, await loadFixtureRoutes("jobtech")),
    ).toEqual([]);
  });

  it("maps a hit's fields, its work mode and its skills", async () => {
    const { drafts } = parseSearch(await fixture());
    expect(drafts).toHaveLength(3);
    expect(drafts.find((draft) => draft.sourceId === "31736558")).toMatchObject(
      {
        source: "jobtech",
        title: "Lärare inom Produktionsteknik",
        location: "Stockholm, Sverige",
        country: "se",
        city: "Stockholm",
        remote: false,
        url: "https://arbetsformedlingen.se/platsbanken/annonser/31736558",
        posted: "2026-11-16",
        expires: "2027-05-15",
        occupationCodes: { ssyk: "SPYW_7Z1_ShT" },
        language: "sv",
      },
    );
    const remote = parseSearch(
      JSON.stringify({
        total: { value: 1 },
        hits: [
          {
            id: 1,
            headline: "Elingenjör",
            workplace_model: { label: "Distansarbete" },
            must_have: { skills: [{ label: "AutoCAD" }, null] },
            description: { text: "Text" },
          },
        ],
      }),
    ).drafts[0];
    expect(remote).toMatchObject({
      remote: true,
      workMode: "remote",
      description: "Text\nAutoCAD",
    });
  });

  it("states its employment type, duration and working hours as its fields (advert-facts FR-1)", () => {
    expect(contractHit("Tills vidare")).toMatchObject({
      contract: "Vanlig anställning · Tills vidare",
      hours: "Heltid",
    });
    expect(contractHit("3 - 6 månader")?.contract).toBe(
      "Vanlig anställning · Tidsbegränsad (6 månader)",
    );
    expect(contractHit("6 månader eller längre")?.contract).toBe(
      "Vanlig anställning",
    );
  });

  it("asks every group of config/ssyk-groups.yml, paging up to its total", async () => {
    const { groups } = await loadSsykGroups();
    const http = new FakeHttpClient();
    const empty = '{"total":{"value":0},"hits":[]}';
    for (const { concept } of groups) http.route(searchUrl(concept, 0), empty);
    const first = groups[0]!.concept;
    http.route(
      searchUrl(first, 0),
      JSON.stringify({ total: { value: 150 }, hits: hits(0, 100) }),
    );
    http.route(
      searchUrl(first, 100),
      JSON.stringify({ total: { value: 150 }, hits: hits(100, 50) }),
    );

    const drafts = await readDrafts(jobtech, fakeContext({ http }));

    expect(drafts).toHaveLength(150);
    expect(http.requests).toHaveLength(groups.length + 1);
  });

  it("fails when a group cannot be read", async () => {
    await expect(
      readDrafts(jobtech, fakeContext({ http: new FakeHttpClient() })),
    ).rejects.toThrow(/no fake route/);
  });
});
