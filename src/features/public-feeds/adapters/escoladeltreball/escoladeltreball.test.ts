import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  CONTRACT_DAY,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import {
  decodeMixed,
  DEPARTMENTS,
  escoladeltreball,
  iscoOf,
  listUrl,
  offerUrl,
  parseList,
  parseOffer,
  titleOf,
} from "./escoladeltreball.js";

// The fixtures are made up in the layout of the real pages (the real ones name people); the
// public offer keeps a Windows-1252 apostrophe and accent in a UTF-8 page, as the real ones do.
const fixture = (file: string) =>
  readFile(join(FIXTURES_DIRECTORY, "escoladeltreball", file));

describe("escoladeltreball (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        escoladeltreball,
        await loadFixtureRoutes("escoladeltreball"),
      ),
    ).toEqual([]);
  });

  it("reads each row's first day and its offer from a list", async () => {
    expect(parseList((await fixture("list.html")).toString("utf8"))).toEqual([
      { day: "2026-11-12", id: "900001" },
      { day: "2026-11-10", id: "900002" },
      { day: "2026-11-05", id: "900003" },
      { day: "2026-06-02", id: "900004" },
    ]);
  });

  it("decodes a page that mixes UTF-8 and Windows-1252", async () => {
    const text = decodeMixed(
      new Uint8Array(await fixture("offer-900001.html")),
    );
    expect(text).toContain("Descripció");
    expect(text).toContain("tècnic per al manteniment d’obres i màquines");
  });

  it("maps an offer: the qualification as its title, its ISCO group, its facts, and no contact", async () => {
    const draft = parseOffer(
      decodeMixed(new Uint8Array(await fixture("offer-900001.html"))),
      "900001",
      "2026-11-12",
    );
    expect(draft).toMatchObject({
      sourceId: "900001",
      title: "Tècnic/a superior en Mecatrònica industrial",
      company: "EMPRESA EXEMPLE, S.L.",
      city: "Cornellà de Llobregat",
      location: "Cornellà de Llobregat, Barcelona, España",
      country: "es",
      language: "ca",
      occupationCodes: { isco: "3115" },
      posted: "2026-11-12",
      expires: "2026-12-07",
      url: offerUrl("900001"),
      contract: "Indefinit",
      hours: "Indefinit",
    });
    expect(draft?.description).toBe(
      "Es busca tècnic per al manteniment d’obres i màquines. Enviar CV a o trucar al .\nEspecialitat: Fabricació mecànica\nEstudis: Mecatrònica industrial DUAL (grau superior)\nContracte: Indefinit\nHorari: Matí i tarda\nIncorporació: Immediata\nSou (brut/any): 28800\nIdiomes: Castellà, Anglès",
    );
    expect(JSON.stringify(draft)).not.toMatch(
      /persona|exemple\.test|Persona Exemple|933/,
    );
  });

  it("writes a town given in capitals as a name", async () => {
    const html = decodeMixed(
      new Uint8Array(await fixture("offer-900001.html")),
    ).replace("Cornellà de Llobregat", "CORNELLÀ DE LLOBREGAT");
    expect(parseOffer(html, "900001", "2026-11-12")?.city).toBe(
      "Cornellà De Llobregat",
    );
  });

  it("leaves a restricted offer out", async () => {
    expect(
      parseOffer(
        (await fixture("offer-900002.html")).toString("utf8"),
        "900002",
        "2026-11-10",
      ),
    ).toBeUndefined();
  });

  it("names the title from the studies or the specialty, and the ISCO group from either", () => {
    expect(titleOf("Soldadura (grau mitjà)", "")).toBe("Tècnic/a en Soldadura");
    expect(titleOf("Cura de persones (grau bàsic)", "")).toBe(
      "Professional bàsic en Cura de persones",
    );
    expect(titleOf("Altres", "Electricitat")).toBe("Tècnic/a en Electricitat");
    expect(titleOf("Altres", "Altres")).toBe("");
    expect(
      iscoOf("Instal·lacions elèctriques i automàtiques (grau mitjà)"),
    ).toBe("7411");
    expect(iscoOf("Cuina")).toBeUndefined();
  });

  it("reads each department, skips what is old, restricted or closed, and keeps an open offer it read before", async () => {
    const http = new FakeHttpClient(
      await loadFixtureRoutes("escoladeltreball"),
    );
    const first = await readDrafts(
      escoladeltreball,
      fakeContext({ http, today: CONTRACT_DAY }),
    );
    expect(first.map((draft) => draft.sourceId)).toEqual(["900001"]);
    const asked = http.requests.map((request) => request.url);
    expect(asked.filter((url) => url.includes("/consultar"))).toEqual(
      DEPARTMENTS.map(listUrl),
    );
    // Each offer once however many departments list it; the old one never.
    expect(asked.filter((url) => url.includes("/ofertes/")).toSorted()).toEqual(
      ["900001", "900002", "900003"].map(offerUrl),
    );

    const again = new FakeHttpClient(
      await loadFixtureRoutes("escoladeltreball"),
    );
    await readDrafts(
      escoladeltreball,
      fakeContext({ http: again, today: CONTRACT_DAY, previous: first }),
    );
    // The open one is not asked for again.
    expect(
      again.requests.some((request) => request.url === offerUrl("900001")),
    ).toBe(false);
  });
});
