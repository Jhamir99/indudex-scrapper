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
import { iefp, pageBody, parseCards, SEARCH } from "./iefp.js";

const ACTION = "/IEFP/pesquisas/search.do;jsessionid=ABC";
const searchPage = (total: number) =>
  `<form name="pesquisaForm" method="POST" action="${ACTION}"><input name="resultCount" value="${total}"></form>`;
const card = (
  id: number,
  title = "Técnico de Eletricidade",
  place = "VILA NOVA DE GAIA",
  way = "Misto",
) =>
  `<article><div id="ofertacard_${id}"><div class="d-flex align-items-center"><strong>${title}</strong></div><div class="text-uppercase">Localização e Horário</div><div><strong> ${place} | a combinar </strong></div><div class="text-uppercase">Forma de prestação de trabalho</div><div><strong>${way}</strong></div></div></article>`;

// The search as `total` offers, a page of up to 100 by the position the body asks.
function searchServer(total: number, listed = total): HttpClient {
  return {
    async request(url, options) {
      if (url === SEARCH)
        return { status: 200, url, headers: {}, body: searchPage(total) };
      if (options?.method === "POST") {
        const position = Number(new URLSearchParams(options.body).get("pos"));
        const count = Math.max(0, Math.min(100, listed - position));
        const body = Array.from({ length: count }, (_, k) =>
          card(position + k + 1),
        ).join("");
        return { status: 200, url, headers: {}, body };
      }
      throw new Error("no own page");
    },
  };
}

describe("iefp (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(iefp, await loadFixtureRoutes("iefp")),
    ).toEqual([]);
  });

  it("maps a card: the town in its own case, the work mode, the ISCO code of its CPP name", () => {
    const [draft] = parseCards(card(7, "Técnico de Eletricidade (M/F)"));
    expect(draft).toMatchObject({
      sourceId: "7",
      title: "Técnico de Eletricidade",
      location: "Vila Nova de Gaia, Portugal",
      city: "Vila Nova de Gaia",
      workMode: "hybrid",
      occupationCodes: { isco: "3113" },
      url: "https://iefponline.iefp.pt/IEFP/pesquisas/detalheOfertas2.do?idOferta=7",
    });
  });

  it("adds an offer's profile and conditions from its own page", async () => {
    const drafts = await readDrafts(
      iefp,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("iefp")),
      }),
    );
    expect(drafts).toHaveLength(3);
    expect(drafts[0]?.description).toMatch(
      /^EMPRESA COMERCIALIZA MATERIAIS DE CONSTRUÇÃO/,
    );
    expect(drafts[0]?.description).toContain("Sem termo");
  });

  it("turns the pages through the form's address and fails a pass well short of the count", async () => {
    const http = searchServer(250);
    expect(await readDrafts(iefp, fakeContext({ http }))).toHaveLength(250);
    expect(pageBody(200)).toContain("pos=200&currentPage=3");
    await expect(
      readDrafts(iefp, fakeContext({ http: searchServer(250, 100) })),
    ).rejects.toThrow("100 offers read of the 250 it counts");
  });

  it("fails when the search page holds no form", async () => {
    const http = new FakeHttpClient({ [SEARCH]: "<html>Manutenção</html>" });
    await expect(readDrafts(iefp, fakeContext({ http }))).rejects.toThrow(
      "the search page holds no form or count",
    );
  });
});
