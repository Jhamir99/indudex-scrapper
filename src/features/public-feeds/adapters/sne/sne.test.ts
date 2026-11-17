import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  fakeDraft,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import {
  listUrl,
  offerUrl,
  parseOffers,
  pdfPieces,
  REGIONS,
  sne,
  toDraft,
} from "./sne.js";

// test/fixtures/sne/offers.pdf is built by hand in the layout of the SNE's regional PDFs (a post,
// "Town ( PROVINCE )", "Oferta: <number>", a day and "Oficina: <office>" on the left, the offer's
// text on the right), with made-up offers: the real ones name people. It has two pages: an
// office in two lines, a post in two lines, an offer's text that goes on to the next page.
const pdf = async () =>
  new Uint8Array(await readFile(join(FIXTURES_DIRECTORY, "sne", "offers.pdf")));

describe("sne (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(sne, await loadFixtureRoutes("sne")),
    ).toEqual([]);
  });

  it("reads each offer's post, place, number, day, office and text from the PDF", async () => {
    const offers = parseOffers(await pdfPieces(await pdf()));
    expect(offers.map((offer) => offer.code)).toEqual([
      "172026009001",
      "172026009002",
      "172026009003",
      "172026009004",
    ]);
    expect(offers[0]).toMatchObject({
      title: "ELECTRICISTA DE MANTENIMIENTO",
      town: "Calahorra",
      province: "LA RIOJA",
      posted: "2026-11-12",
      office: "CALAHORRA",
    });
    // The post in two lines and the office in two lines.
    expect(offers[1]).toMatchObject({
      title:
        "AYUNTAMIENTO DE EJEMPLO DE LA SIERRA TÉCNICO DE ADMINISTRACIÓN - FORMACIÓN",
      office: "LOGROÑO-COMPROMISO DE EMPLEO",
    });
    // The text goes on at the top of the next page.
    expect(offers[2]?.text).toMatch(
      /Incorporación inmediata\. Las personas interesadas .* y acudir a la Oficina de Empleo de Haro/,
    );
    expect(offers[3]?.text).toBe(
      "Se necesita personal de limpieza para comunidad de vecinos, por las mañanas. Contrato temporal de seis meses, jornada parcial.",
    );
  });

  it("cuts contacts and markup from the text", async () => {
    const offers = parseOffers(await pdfPieces(await pdf()));
    expect(offers[0]?.text).not.toMatch(/@|941/);
    expect(offers[0]?.text).toMatch(/enviar currículum a o llamar al ,/);
    expect(offers[1]?.text).toMatch(/Más información en la web \.$/);
    expect(offers[1]?.text).not.toMatch(/[<>"]|ejemplo\.test/);
  });

  it("makes the advert: the post as written, its place, and the source and the day of the copy", async () => {
    const [first] = parseOffers(await pdfPieces(await pdf()));
    const draft = toDraft(first!, "17", "2026-11-17");
    expect(draft).toMatchObject({
      sourceId: "172026009001",
      title: "ELECTRICISTA DE MANTENIMIENTO",
      company: "",
      // The province and the region are one name: said once.
      location: "Calahorra, La Rioja, España",
      city: "Calahorra",
      country: "es",
      language: "es",
      posted: "2026-11-12",
      url: offerUrl("172026009001"),
    });
    expect(draft?.description).toMatch(
      /Fuente: Sistema Nacional de Empleo \(SEPE\), copia del 2026-11-17\.$/,
    );
    expect(
      toDraft({ ...first!, town: "Elche/Elx", province: "ALICANTE" }, "10", "x")
        ?.location,
    ).toBe("Elche/Elx, Alicante, Comunitat Valenciana, España");
  });

  it("asks for each region's PDF as a file, and keeps the offers of a region whose PDF does not come", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("sne"));
    const previous = [
      fakeDraft("sne", "old-navarra", {
        location: "Pamplona, Navarra, España",
      }),
      fakeDraft("sne", "old-aragon", { location: "Huesca, Aragón, España" }),
    ];
    const drafts = await readDrafts(
      sne,
      fakeContext({ http, previous, today: "2026-11-17" }),
    );
    expect(http.requests.map((request) => request.url)).toEqual(
      Object.keys(REGIONS).map(listUrl),
    );
    expect(http.requests.every((request) => request.options.binary)).toBe(true);
    // Navarra and La Rioja answer (the same four offers), the other ten regions fail: the earlier
    // offers of Aragón are kept, those of Navarra are replaced by what it read.
    expect(drafts.map((draft) => draft.sourceId).toSorted()).toEqual([
      "172026009001",
      "172026009002",
      "172026009003",
      "172026009004",
      "old-aragon",
    ]);
  });

  it("fails when no region's PDF comes, or an answer is no PDF", async () => {
    await expect(
      readDrafts(sne, fakeContext({ http: new FakeHttpClient() })),
    ).rejects.toThrow(/no region read \(.*Aragón.*Asturias/);
    const html = new FakeHttpClient(
      Object.fromEntries(
        Object.keys(REGIONS).map((region) => [
          listUrl(region),
          { headers: { "content-type": "text/html" }, body: "<html/>" },
        ]),
      ),
    );
    await expect(readDrafts(sne, fakeContext({ http: html }))).rejects.toThrow(
      /no region read/,
    );
  });
});
