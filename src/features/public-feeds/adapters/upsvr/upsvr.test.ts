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
import type { HttpClient } from "../../../crawl-core/ports.js";
import { listUrl, upsvr } from "./upsvr.js";

const list = (count: number, from: number, size: number, source = 1) =>
  JSON.stringify({
    countVPM: count,
    pracovnePonuky: Array.from({ length: size }, (_, k) => ({
      uuid: `u${from + k}`,
      nazovPracovnehoMiesta: `Elektrikár ${from + k}`,
      priznakZdroj: source,
      miestoVykonuPrace: "Košice - Košice I",
    })),
  });

describe("upsvr (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(upsvr, await loadFixtureRoutes("upsvr")),
    ).toEqual([]);
  });

  it("maps a listed offer and what its own page adds", async () => {
    const drafts = await readDrafts(
      upsvr,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("upsvr")),
      }),
    );
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({
      source: "upsvr",
      sourceId: "c929fc52-6bff-444d-a39d-30c47ac6d096",
      title: "Servisný technik/ údržbár",
      company: "EUROTRADING SK, s.r.o.",
      location: "Spišské Tomášovce, Slovensko",
      city: "Spišské Tomášovce",
      url: "https://www.sluzbyzamestnanosti.gov.sk/pracovne-ponuky/c929fc52-6bff-444d-a39d-30c47ac6d096",
      posted: "2026-11-16",
      occupationCodes: { isco: "5153" },
    });
    expect(drafts[0]?.description).toMatch(
      /^Základná mzda: 1550 € mesačne\nNáplň práce: Servisný technik/,
    );
    expect(drafts[0]?.description).toContain(
      "Pracovný a mimopracovný pomer: Pracovný pomer na neurčitý čas",
    );
  });

  it("leaves out offers shown from other portals", async () => {
    const http = new FakeHttpClient({ [listUrl(1)]: list(2, 0, 2, 3) });
    await expect(readDrafts(upsvr, fakeContext({ http }))).rejects.toThrow(
      "the feed holds no advert",
    );
  });

  it("asks a page again when it comes from the other server or unreadable", async () => {
    let asked = 0;
    const http: HttpClient = {
      async request(url) {
        if (url === listUrl(1))
          return { status: 200, url, headers: {}, body: list(150, 0, 100) };
        if (url === listUrl(2)) {
          asked += 1;
          const body =
            asked === 1
              ? list(25_000, 100, 100)
              : asked === 2
                ? ""
                : list(150, 100, 50);
          return { status: 200, url, headers: {}, body };
        }
        throw new Error("no own page");
      },
    };
    const drafts = await readDrafts(upsvr, fakeContext({ http }));
    expect(asked).toBe(3);
    expect(drafts).toHaveLength(150);
  });

  it("fails a pass that read far fewer offers than the search counts", async () => {
    const http = new FakeHttpClient({
      [listUrl(1)]: list(300, 0, 100),
      [listUrl(2)]: list(300, 100, 0),
    });
    await expect(readDrafts(upsvr, fakeContext({ http }))).rejects.toThrow(
      "100 offers read of the 300 it counts",
    );
  });
});
