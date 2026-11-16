import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  fakeDraft,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import type { SourceMemory } from "../../../crawl-core/ports.js";
import {
  CATEGORIES,
  hungary,
  MOST_REQUESTS,
  nextCategory,
  parseResults,
  searchUrl,
} from "./hungary.js";

// A result page with these vacancy ids, and optionally "too many to list".
function results(ids: readonly string[], tooMany = 0): string {
  const rows = ids
    .map(
      (id) =>
        `<tr>\n<td><a href="/allas/reszletek/${id}">2151 - Villamosmérnök</a></td>\n<td><a href="/allas/reszletek/${id}">egyetem</a></td>\n<td><a href="/allas/reszletek/${id}">Budapest 11. ker.</a></td>`,
    )
    .join("\n");
  const head = tooMany
    ? `A lista túl sok elemet tartalmaz (${tooMany})`
    : `Találatok listája (${ids.length} találat)`;
  return `<table><thead><tr><td>${head}</td></tr></thead>${rows}</table>`;
}

function pass(
  http: FakeHttpClient,
  memory?: SourceMemory,
  previous = [] as ReturnType<typeof fakeDraft>[],
) {
  let remembered: SourceMemory | undefined;
  const context = fakeContext({
    http,
    memory,
    previous,
    remember: (value) => {
      remembered = value;
    },
  });
  return readDrafts(hungary, context).then((drafts) => ({
    drafts,
    remembered,
  }));
}

describe("hungary (public-feeds FR-1, FR-4)", () => {
  it("maps the saved category page into valid adverts", async () => {
    expect(
      await checkAdapterContract(hungary, await loadFixtureRoutes("hungary")),
    ).toEqual([]);
  });

  it("maps a row: the FEOR occupation as title, the schooling as text, the town without its district", () => {
    const [draft] = parseResults(results(["1"])).drafts;
    expect(draft).toMatchObject({
      sourceId: "1",
      title: "Villamosmérnök",
      location: "Budapest 11. ker., Magyarország",
      city: "Budapest",
      url: "https://vmp.munka.hu/allas/reszletek/1",
      description: "Iskolai végzettség: egyetem",
      country: "hu",
    });
  });

  it("reads the next category each pass and keeps what the others gave", async () => {
    const http = new FakeHttpClient({
      [searchUrl("19")]: results(["101", "102"]),
      [searchUrl("9")]: results(["201"]),
    });

    const first = await pass(http);
    expect(first.drafts.map((d) => d.sourceId)).toEqual(["101", "102"]);
    expect(first.remembered).toEqual({
      last: "19",
      categories: { "19": ["101", "102"] },
    });

    const previous = first.drafts;
    const second = await pass(http, first.remembered, previous);
    expect(second.drafts.map((d) => d.sourceId)).toEqual(["201", "101", "102"]);
    expect(second.remembered).toEqual({
      last: "9",
      categories: { "19": ["101", "102"], "9": ["201"] },
    });
    expect(http.requests.map((r) => r.url)).toEqual([
      searchUrl("19"),
      searchUrl("9"),
    ]);
  });

  it("drops an advert its own category no longer lists", async () => {
    const http = new FakeHttpClient({ [searchUrl("19")]: results(["101"]) });
    const memory = {
      last: "24",
      categories: { "19": ["101", "999"], "9": ["201"] },
    };
    const previous = [
      fakeDraft("hungary", "101"),
      fakeDraft("hungary", "999"),
      fakeDraft("hungary", "201"),
    ];

    const { drafts } = await pass(http, memory, previous);

    expect(drafts.map((d) => d.sourceId)).toEqual(["101", "201"]);
  });

  it("reads the next category in the same pass when one lists nothing", async () => {
    const http = new FakeHttpClient({
      [searchUrl("19")]: results([]),
      [searchUrl("9")]: results(["201"]),
    });
    const { drafts, remembered } = await pass(http);
    expect(drafts.map((d) => d.sourceId)).toEqual(["201"]);
    expect(remembered).toMatchObject({ last: "9" });
  });

  it(`splits a category by region and asks at most ${MOST_REQUESTS} times`, async () => {
    const http = new FakeHttpClient({ [searchUrl("19")]: results([], 900) });
    let k = 0;
    for (const region of [
      "Közép-Magyarország",
      "Közép-Dunántúl",
      "Nyugat-Dunántúl",
      "Dél-Dunántúl",
      "Észak-Magyarország",
      "Észak-Alföld",
      "Dél-Alföld",
    ])
      http.route(searchUrl("19", region), results([String(300 + k++)]));

    const { drafts } = await pass(http);

    expect(http.requests).toHaveLength(MOST_REQUESTS);
    expect(drafts).toHaveLength(7);
  });

  it("starts after the last category read and wraps round", () => {
    expect(nextCategory(undefined)).toBe(0);
    expect(nextCategory({ last: "9", categories: {} })).toBe(2);
    expect(nextCategory({ last: CATEGORIES.at(-1)!, categories: {} })).toBe(0);
  });
});
