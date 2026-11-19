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
import type { HttpClient } from "../../../crawl-core/ports.js";
import { actiris, LIST, offerUrl, parseList } from "./actiris.js";

const offers = (from: number, count: number) =>
  Array.from({ length: count }, (_, k) => ({
    reference: String(from + k),
    titreFr: `Électricien ${from + k} H/F/X`,
    communeFr: "Anderlecht",
    typeContratLibelle: "CDI",
    regimeTravail: "NO",
  }));

function listServer(total: number, stopAt = Infinity): HttpClient {
  return {
    async request(url, options) {
      if (url !== LIST) throw new Error("no own page");
      const page = (
        JSON.parse(options?.body ?? "{}") as { pageOption: { page: number } }
      ).pageOption.page;
      const from = (page - 1) * 100;
      const count =
        page >= stopAt ? 0 : Math.max(0, Math.min(100, total - from));
      return {
        status: 200,
        url,
        headers: {},
        body: JSON.stringify({ total, offers: offers(from + 1, count) }),
      };
    },
  };
}

describe("actiris (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(actiris, await loadFixtureRoutes("actiris")),
    ).toEqual([]);
  });

  it("maps an offer: its title without the gender mark, its contract and regime", () => {
    const [draft] = parseList(
      JSON.stringify({ total: 1, offers: offers(7, 1) }),
    ).drafts;
    expect(draft).toMatchObject({
      sourceId: "7",
      title: "Électricien 7",
      city: "Anderlecht",
      location: "Anderlecht, Belgique",
      country: "be",
      description: "CDI, temps plein",
      language: "fr",
      url: offerUrl("7"),
      contract: "CDI",
      hours: "temps plein",
    });
  });

  it("adds an offer's own text before its facts", async () => {
    const [first] = await readDrafts(
      actiris,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("actiris")),
      }),
    );
    expect(first?.description).toMatch(/^L'Agence de Bruxelles Propreté/);
    expect(first?.description).toMatch(/\nStage FIRST, temps plein$/);
  });

  it("reads again an offer stored with only the list's facts, and not one read before", async () => {
    const asked: string[] = [];
    const server = listServer(2);
    const http: HttpClient = {
      request: (url, options) => {
        if (url !== LIST) asked.push(url);
        return url === LIST
          ? server.request(url, options)
          : Promise.resolve({ status: 200, url, headers: {}, body: "" });
      },
    };
    await readDrafts(
      actiris,
      fakeContext({
        http,
        previous: [
          fakeDraft("actiris", "1", { description: "CDI, temps plein" }),
          fakeDraft("actiris", "2", {
            description: "Read before.\nCDI, temps plein",
          }),
        ],
      }),
    );
    expect(asked).toEqual([offerUrl("1")]);
  });

  it("pages up to the total and fails a pass well short of it", async () => {
    expect(
      await readDrafts(actiris, fakeContext({ http: listServer(250) })),
    ).toHaveLength(250);
    await expect(
      readDrafts(actiris, fakeContext({ http: listServer(250, 2) })),
    ).rejects.toThrow("100 offers read of the 250 it counts");
  });
});
