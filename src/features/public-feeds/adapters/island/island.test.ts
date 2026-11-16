import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import type {
  HttpClient,
  HttpRequestOptions,
} from "../../../crawl-core/ports.js";
import {
  API,
  island,
  parseDirectorate,
  parseStarfatorg,
  STARFATORG,
} from "./island.js";

const fixture = (name: string) =>
  readFile(
    new URL(`../../../../../test/fixtures/island/${name}`, import.meta.url),
    "utf8",
  );

// The Directorate's list as pages of `size` items out of `total`, by the page the query asks.
function islandServer(total: number, size: number, stateHtml: string) {
  const pagesAsked: number[] = [];
  const http: HttpClient = {
    async request(url: string, options?: HttpRequestOptions) {
      if (url === STARFATORG)
        return { status: 200, url, headers: {}, body: stateHtml };
      const page = JSON.parse(options?.body ?? "{}").variables.input
        .page as number;
      pagesAsked.push(page);
      const from = (page - 1) * size;
      const items = Array.from(
        { length: Math.max(0, Math.min(size, total - from)) },
        (_, k) => ({
          id: `id${from + k}`,
          title: `Rafvirki ${from + k} - Orka ehf.`,
          slug: `rafvirki-${from + k}`,
          date: "2026-12-01",
          filterTags: [{ title: "Suðurland" }],
        }),
      );
      const body = JSON.stringify({
        data: { getGenericListItems: { items, total } },
      });
      return { status: 200, url, headers: {}, body };
    },
  };
  return { http, pagesAsked };
}

describe("island (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(island, await loadFixtureRoutes("island")),
    ).toEqual([]);
  });

  it("maps a State vacancy", async () => {
    const [first] = parseStarfatorg(await fixture("starfatorg.html"));
    expect(first).toEqual({
      source: "island",
      sourceId: "starfatorg-x-59c96502-8759-400f-a2b2-bfd0a7ad860c",
      title: "Hjúkrunarfræðingur - Heilsugæslan Glæsibæ",
      company: "Heilsugæsla höfuðborgarsvæðisins",
      location: "Höfuðborgarsvæðið, Ísland",
      country: "is",
      city: "",
      remote: false,
      url: "https://island.is/starfatorg/x-59c96502-8759-400f-a2b2-bfd0a7ad860c",
      description: expect.stringMatching(
        /^Heilsugæslan Glæsibær leitar að hjúkrunarfræðingi .* Heilsugæsla höfuðborgarsvæðisins$/,
      ),
      posted: "2026-11-16",
      expires: "2026-11-30",
      occupationCodes: {},
      language: "is",
    });
  });

  it("maps a Directorate vacancy, splitting post and employer, and leaves jobs abroad out", async () => {
    const page = parseDirectorate(
      await fixture("vinnumalastofnun-page-1.json"),
    );
    expect(page.total).toBe(15);
    expect(page.ids).toHaveLength(15);
    expect(page.drafts).toHaveLength(13);
    expect(page.drafts[0]).toMatchObject({
      sourceId: "vmst-1TmUZQ80Faku16Q4a4nKcF",
      title: "Fiskflökun og fiskvinnsla",
      company: "Afa fiskur ehf.",
      location: "Suðurnes, Ísland",
      expires: "2026-12-05",
      url: "https://island.is/s/vinnumalastofnun/laus-storf/fiskflokun-og-fiskvinnsla-afa-fiskur-ehf-5-12-2026",
    });
  });

  it("reads the Directorate's list page by page up to its total", async () => {
    const { http, pagesAsked } = islandServer(
      250,
      100,
      await fixture("starfatorg.html"),
    );
    const drafts = await readDrafts(island, fakeContext({ http }));
    expect(pagesAsked).toEqual([1, 2, 3]);
    expect(drafts).toHaveLength(3 + 250);
  });

  it("fails when the list stops short of its total", async () => {
    const { http } = islandServer(250, 100, await fixture("starfatorg.html"));
    const shortServer: HttpClient = {
      request: (url, options) =>
        url === API &&
        JSON.parse(options?.body ?? "{}").variables.input.page === 3
          ? Promise.resolve({
              status: 200,
              url,
              headers: {},
              body: '{"data":{"getGenericListItems":{"items":[],"total":250}}}',
            })
          : http.request(url, options),
    };
    await expect(
      readDrafts(island, fakeContext({ http: shortServer })),
    ).rejects.toThrow("the Directorate's list gave 200 of its 250 vacancies");
  });

  it("reports answers that hold nothing as a failure", async () => {
    const { http } = islandServer(0, 100, "<html>Viðhald</html>");
    await expect(readDrafts(island, fakeContext({ http }))).rejects.toThrow(
      "the feed holds no advert",
    );
  });
});
