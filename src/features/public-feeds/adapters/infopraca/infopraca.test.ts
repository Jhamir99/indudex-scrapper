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
  DETAILS_A_PASS,
  infopraca,
  parseSearch,
  QUERIES,
  searchUrl,
  townOf,
} from "./infopraca.js";

const items = (from: number, count: number) =>
  JSON.stringify(
    Array.from({ length: count }, (_, k) => ({
      id: from + k,
      title: `Inżynier ${from + k}`,
      url: `https://www.infopraca.pl/praca/inzynier/warszawa/${from + k}`,
      city: "Warszawa 00-001",
    })),
  );

function emptySearches(): FakeHttpClient {
  const http = new FakeHttpClient();
  for (const query of QUERIES) http.route(searchUrl(query, 1), "[]");
  return http;
}

describe("infopraca (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        infopraca,
        await loadFixtureRoutes("infopraca"),
      ),
    ).toEqual([]);
  });

  it("maps a listed offer, its town without the postcode, and its own page's text and days", async () => {
    const routes = await loadFixtureRoutes("infopraca");
    const drafts = await readDrafts(
      infopraca,
      fakeContext({ http: new FakeHttpClient(routes) }),
    );
    expect(drafts[0]).toMatchObject({
      source: "infopraca",
      sourceId: "18202224",
      title: "Inżynier Budowy ds. Mechanicznych (Rurociągi)",
      company: "Aldesa Polska Services Sp. z o.o.",
      location: "Płock, Polska",
      city: "Płock",
      posted: "2026-04-02",
      expires: "2026-11-24",
      employmentType: ["FULL_TIME"],
    });
    expect(drafts[0]?.description).toMatch(/^Poszukujemy Inżyniera Budowy/);
    expect(drafts[1]?.city).toBe("Płock");
    expect(townOf("38-543 Nowy Łupków")).toBe("Nowy Łupków");
  });

  it("pages a search until a short page, without pg on the first", async () => {
    const http = emptySearches();
    http.route(searchUrl("inżynier", 1), items(1, 18));
    http.route(searchUrl("inżynier", 2), items(19, 2));
    for (let id = 1; id <= 20; id++)
      http.route(
        `https://www.infopraca.pl/praca/inzynier/warszawa/${id}`,
        "<html></html>",
      );

    const drafts = await readDrafts(infopraca, fakeContext({ http }));

    expect(drafts).toHaveLength(20);
    expect(searchUrl("inżynier", 1)).toBe(
      "https://www.infopraca.pl/praca?q=in%C5%BCynier",
    );
    expect(searchUrl("inżynier", 2)).toBe(
      "https://www.infopraca.pl/praca?q=in%C5%BCynier&pg=2",
    );
  });

  it(`reads at most ${DETAILS_A_PASS} own pages a pass`, async () => {
    const http = emptySearches();
    const total = DETAILS_A_PASS + 5;
    for (let page = 1; page <= Math.ceil(total / 18); page++)
      http.route(
        searchUrl("inżynier", page),
        items((page - 1) * 18 + 1, Math.min(18, total - (page - 1) * 18)),
      );

    const drafts = await readDrafts(infopraca, fakeContext({ http }));

    expect(drafts).toHaveLength(total);
    const ownPages = http.requests.filter((r) =>
      r.url.includes("/praca/inzynier/"),
    );
    expect(ownPages).toHaveLength(DETAILS_A_PASS);
  });

  it("reports searches that answer nothing as a failure", async () => {
    await expect(
      readDrafts(infopraca, fakeContext({ http: emptySearches() })),
    ).rejects.toThrow("the feed holds no advert");
    expect(parseSearch("[]").drafts).toEqual([]);
  });
});
