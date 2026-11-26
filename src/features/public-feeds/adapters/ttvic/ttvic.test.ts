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
import { LIST, parseList, ttvic } from "./ttvic.js";

const page = (n: number) =>
  `<h5 class="card-title"><a href="https://ttvic.com/ca/ofertes-de-treball-temporal/info/o-${n}">O ${n}</a></h5><li class="next page-item"><a class="page-link" href="${LIST}?page=${n + 1}">`;

describe("ttvic (public-feeds FR-1, FR-6)", () => {
  it("is read, as the legacy reads it: its notice forbids only robots that disturb the site (the operator's call, 2026-11-26)", () => {
    expect(ttvic.definition.disabledReason).toBeUndefined();
  });

  it("maps the documented format into valid adverts", async () => {
    expect(
      await checkAdapterContract(ttvic, await loadFixtureRoutes("ttvic")),
    ).toEqual([]);
  });

  it("maps a card and adds its page's text", async () => {
    const drafts = await readDrafts(
      ttvic,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("ttvic")),
      }),
    );
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      sourceId: "electricista-vic-1001",
      title: "Electricista",
      city: "Vic",
      location: "Vic, Catalunya, España",
    });
    expect(drafts[0]?.description).toBe(
      "Descripció de l'oferta\nInstal·lacions elèctriques en naus industrials.\nRequisits: Experiència de 2 anys\nCarnet de conduir\nSector: Instal·lacions",
    );
    expect(drafts[1]).toMatchObject({
      title: "Operari/a taller metall",
      city: "Manlleu",
      description: "Sector: Metal·lúrgia",
    });
  });

  it("follows the next link up to ten pages", async () => {
    const http = new FakeHttpClient({ [LIST]: page(0) });
    for (let n = 1; n < 12; n++) http.route(`${LIST}?page=${n}`, page(n));
    const drafts = await readDrafts(ttvic, fakeContext({ http }));
    expect(drafts).toHaveLength(10);
    expect(parseList(page(3)).next).toBe(`${LIST}?page=4`);
  });
});
