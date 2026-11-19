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
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import { LIST, offerUrl, parseSae, sae } from "./sae.js";

describe("sae (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(sae, await loadFixtureRoutes("sae")),
    ).toEqual([]);
  });

  it("maps an offer: its title as a sentence, its town as a name, its facts after its text", async () => {
    const drafts = parseSae(
      await readFile(join(FIXTURES_DIRECTORY, "sae", "offers.json"), "utf8"),
    );
    expect(drafts).toHaveLength(4);
    expect(drafts[0]).toMatchObject({
      sourceId: "01-2026-51275",
      title:
        "Personal funcionario interino asimilado a a2.1100 cuerpo de gest.administrativa, especialidad administración general (a2.1100)",
      company: "",
      city: "Malaga",
      location: "Malaga, Málaga, España",
      country: "es",
      language: "es",
      posted: "2026-11-12",
      expires: "2026-11-17",
      url: offerUrl("01-2026-51275"),
    });
    expect(drafts[0]?.description).toMatch(
      /\nOcupación: Técnicos medios en organización y administración de empresas, en general · Contrato: Interinidad · Jornada: Completa · Puestos: 2$/,
    );
    expect(drafts[0]).toMatchObject({
      contract: "INTERINIDAD",
      hours: "Jornada completa",
    });
    // A mixed-case title is kept as written; a town's article after a comma comes first.
    expect(drafts[1]?.title).toBe("Soldador - montador");
    expect(drafts[2]?.city).toBe("El Coronil");
  });

  it("asks for the whole list with one POST", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("sae"));
    await readDrafts(sae, fakeContext({ http }));
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]).toMatchObject({
      url: LIST,
      options: { method: "POST", body: "{}" },
    });
  });

  it("fails a list that holds no offer", async () => {
    await expect(
      readDrafts(
        sae,
        fakeContext({ http: new FakeHttpClient({ [LIST]: "[]" }) }),
      ),
    ).rejects.toThrow("the feed holds no advert");
  });
});
