import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
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
  bolzano,
  OWN,
  parseBolzano,
  SEARCH,
  titleLanguage,
} from "./bolzano.js";

// `count` offers numbered from `from`.
const offers = (from: number, count: number) =>
  Array.from({ length: count }, (_, k) => ({
    id: from + k,
    titolo: `Elettricista ${from + k}`,
    luogoLavoro: "Bolzano",
  }));

describe("bolzano (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(bolzano, await loadFixtureRoutes("bolzano")),
    ).toEqual([]);
  });

  it("maps an offer: its own page or its employer's, its town without its district, its facts", async () => {
    const { total, drafts } = parseBolzano(
      await readFile(
        join(FIXTURES_DIRECTORY, "bolzano", "offers.json"),
        "utf8",
      ),
    );
    expect(total).toBe(3);
    expect(drafts[0]).toMatchObject({
      sourceId: "1024525",
      title: "Cercasi personale SELVA DI VAL GARDENA (BZ)",
      company: "Regatta Italia Srl",
      city: "Selva di Val Gardena",
      location: "Selva di Val Gardena, Italia",
      country: "it",
      language: "it",
      url: "https://ejob.civis.bz.it/it/offerDetailPublic/1024525",
      posted: "2026-11-17",
      expires: "2026-12-16",
      contract: "tempo determinato o stagionale",
    });
    expect(drafts[0]?.description).toMatch(
      /\nProfessione: commesso di negozio · Contratto: tempo determinato o stagionale$/,
    );
    // An offer of another site: its address and its external id.
    expect(drafts[1]).toMatchObject({
      sourceId: "337810_WeDaM1mp_byekaV4w_TR5xGLq5L9h4gFxC-6",
      company: "Sanitätsbetrieb der Autonomen Provinz Bozen",
      url: "https://sabes.onboard.org/it/jobs/WeDaM1mp?campaign=VG8Ova49",
      language: "it",
    });
    // An anonymous offer names no employer.
    expect(drafts[2]).toMatchObject({ company: "", city: "Silandro" });
  });

  it("reads the language of a title: German words or marks, Italian otherwise", () => {
    expect(titleLanguage("Mitarbeiter für den Verkauf (m/w/d)")).toBe("de");
    expect(titleLanguage("Cuoco/a per ristorante")).toBe("it");
  });

  it("reads each of its three procedures in pages of a hundred up to its count", async () => {
    const asked: { filter: string; start: string | null }[] = [];
    const http: HttpClient = {
      async request(url: string, options?: HttpRequestOptions) {
        const filter = (
          JSON.parse(options?.body ?? "{}") as { requiredFieldList: string[] }
        ).requiredFieldList[0]!;
        const start = new URL(url).searchParams.get("start");
        asked.push({ filter, start });
        // 150 offers in the first procedure, 40 in the others, ids apart.
        const base = OWN.findIndex((own) => filter.endsWith(own)) * 1000 + 1;
        const total = base === 1 ? 150 : 40;
        const page = Number(start);
        const count = Math.min(100, total - (page - 1) * 100);
        return {
          status: 200,
          url,
          headers: {},
          body: JSON.stringify({
            paginatedOffers: {
              totalItems: total,
              offerte: offers(base + (page - 1) * 100, count),
            },
          }),
        };
      },
    };
    const drafts = await readDrafts(bolzano, fakeContext({ http }));
    expect(drafts).toHaveLength(150 + 40 + 40);
    expect(asked.map((a) => `${a.filter.split(":")[1]}#${a.start}`)).toEqual([
      "Direkt vom Unternehmen#1",
      "Direkt vom Unternehmen#2",
      "Arbeitsagenturen#1",
      "AMS Südtirol#1",
    ]);
    expect(SEARCH).toMatch(/\/offerte\/paged$/);
  });

  it("fails a procedure read short of its count and a search that finds nothing", async () => {
    const short: HttpClient = {
      request: async (url) => ({
        status: 200,
        url,
        headers: {},
        body: JSON.stringify({
          totalItems: 100,
          offerte: [{ id: 1, titolo: "Una", luogoLavoro: "Bolzano" }],
        }),
      }),
    };
    await expect(
      readDrafts(bolzano, fakeContext({ http: short })),
    ).rejects.toThrow(
      '1 offers of "Direkt vom Unternehmen" read of the 100 it counts',
    );
    const empty: HttpClient = {
      request: async (url) => ({
        status: 200,
        url,
        headers: {},
        body: JSON.stringify({ totalItems: 0, offerte: [] }),
      }),
    };
    await expect(
      readDrafts(bolzano, fakeContext({ http: empty })),
    ).rejects.toThrow("the search found no offer");
  });
});
