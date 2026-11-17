import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { fakeContext, readDrafts } from "../../../test/fakes/source-adapter.js";
import type { HttpClient, HttpRequestOptions } from "../crawl-core/ports.js";
import {
  myPortalSite,
  parseResults,
  parseSearchForm,
  searchPage,
} from "./myportal.js";

const fixture = (source: string, file: string) =>
  readFile(join(FIXTURES_DIRECTORY, source, file), "utf8");

const BASE = "https://portal.example";
const site = myPortalSite({
  id: "portal",
  base: BASE,
  licence: {
    name: "Portal",
    short: "Portal",
    url: `${BASE}/`,
    licence: "CC BY 4.0",
    credit: "Portal",
  },
});

const card = (id: number) =>
  `<div id="job-${id}" class="job-item"><a href="/offerte-lavoro/x/${id};jsessionid=S1" class="job-link">ELETTRICISTA ${id}</a><div class="job-description">Testo ${id}</div><div class="job-location">- Bologna (BO)</div></div>`;
const answer = (ids: number[], rowCount?: number) =>
  `<?xml version='1.0' encoding='UTF-8'?><partial-response><changes><update id="g"><![CDATA[${ids.map(card).join("")}${rowCount === undefined ? "" : `<script>x({rowCount:${rowCount}})</script>`}]]></update></changes></partial-response>`;

// The search page, then the search (5 offers and the count), then pages of a hundred; a broken
// server sends only its first `sends` offers.
function portalServer(total: number, sends = Infinity) {
  const posts: URLSearchParams[] = [];
  const cookies: (string | undefined)[] = [];
  // The offers from `first` on, `rows` at most: numbered from 1.
  const ids = (first: number, rows: number) =>
    Array.from(
      { length: Math.max(0, Math.min(first + rows, total, sends) - first) },
      (_, k) => first + k + 1,
    );
  const http: HttpClient = {
    async request(url: string, options?: HttpRequestOptions) {
      if (url === searchPage(BASE)) {
        return {
          status: 200,
          url,
          headers: {},
          cookies: ["JSESSIONID=S1; Path=/offerte-lavoro", "ROUTE=n2; Path=/"],
          body: `<form id="searchForm" action="/offerte-lavoro/vacancy/cerca;jsessionid=S1"><input name="javax.faces.ViewState" value="V1"></form><a onclick='PrimeFaces.ab({s:"searchForm:go",f:"searchForm",p:"searchForm",u:"vacancyResultsForm:x"})'>`,
        };
      }
      expect(url).toBe(`${BASE}/offerte-lavoro/vacancy/cerca;jsessionid=S1`);
      const fields = new URLSearchParams(options?.body);
      posts.push(fields);
      cookies.push(options?.headers?.cookie);
      if (fields.get("javax.faces.source") === "searchForm:go") {
        return {
          status: 200,
          url,
          headers: {},
          body: answer(ids(0, 5), total),
        };
      }
      const first = Number(
        fields.get("vacancyResultsForm:vacancyResultsDataGrid_first"),
      );
      return {
        status: 200,
        url,
        headers: {},
        body: answer(ids(first, 100)),
      };
    },
  };
  return { http, posts, cookies };
}

describe("MyPortal (public-feeds FR-1)", () => {
  it("reads the search form: its address with the session, its view state and its button", async () => {
    expect(
      parseSearchForm(await fixture("emilia", "search-page.html")),
    ).toEqual({
      action:
        "/offerte-lavoro/vacancy/cerca;jsessionid=DoifPgkOL6ZJLQexGsQUyCeyXc-woUrcgMHduWQa.vm662lnx",
      viewState: expect.stringMatching(/^\d+:\d+$/),
      command: expect.stringMatching(/^searchForm:/),
    });
    expect(parseSearchForm("<html><body>Manutenzione</body></html>")).toBe(
      undefined,
    );
  });

  it("maps an offer: its title from capitals, its town, its facts after its text", async () => {
    const { total, drafts } = parseResults(
      await fixture("emilia", "search-answer.xml"),
      { id: "emilia", base: "https://lavoroperte.regione.emilia-romagna.it" },
    );
    expect(total).toBe(3);
    expect(drafts[1]).toMatchObject({
      sourceId: "527981",
      title: "Attivita' amministrativa e contabile",
      company: "Gaia Srl",
      location: "Ravenna (RA), Italia",
      city: "Ravenna",
      country: "it",
      language: "it",
      posted: "2026-11-17",
      url: "https://lavoroperte.regione.emilia-romagna.it/offerte-lavoro/ravenna/impiegato-contabile-ravenna/527981",
    });
    expect(drafts[1]?.description).toMatch(
      /\nQualifica ISTAT: Addetti alla contabilità · Tempo pieno · Diploma/,
    );
  });

  it("drops the session from Trento's links and its town from the facts", async () => {
    const { drafts } = parseResults(
      await fixture("trento", "search-answer.xml"),
      { id: "trento", base: "https://www.sil.provincia.tn.it" },
    );
    expect(drafts[1]?.url).toBe(
      "https://www.sil.provincia.tn.it/offerte-lavoro/trento/meccanico-industriale-rovereto/246482",
    );
    expect(drafts[1]?.description).toMatch(
      /^ORIENTA S\.p\.A\.,Società Benefit.*\nQualifica ISTAT: Meccanici e montatori di macchinari industriali ed assimilati · Altro · Lavoro dipendente TD$/s,
    );
  });

  it("pages a hundred at a time up to the count, in the search's session", async () => {
    const { http, posts, cookies } = portalServer(250);
    const drafts = await readDrafts(site, fakeContext({ http }));
    expect(drafts).toHaveLength(250);
    expect(drafts[0]?.url).toBe(`${BASE}/offerte-lavoro/x/1`);
    expect(
      posts.map((fields) => [
        fields.get("javax.faces.ViewState"),
        fields.get("vacancyResultsForm:vacancyResultsDataGrid_first"),
      ]),
    ).toEqual([
      ["V1", null],
      ["V1", "0"],
      ["V1", "100"],
      ["V1", "200"],
    ]);
    expect(new Set(cookies)).toEqual(new Set(["JSESSIONID=S1; ROUTE=n2"]));
  });

  it("fails a pass well short of the count and a search page that changed", async () => {
    await expect(
      readDrafts(site, fakeContext({ http: portalServer(250, 150).http })),
    ).rejects.toThrow("150 offers read of the 250 it counts");
    const changed: HttpClient = {
      request: async (url) => ({ status: 200, url, headers: {}, body: "" }),
    };
    await expect(
      readDrafts(site, fakeContext({ http: changed })),
    ).rejects.toThrow("the search page has changed");
  });
});
