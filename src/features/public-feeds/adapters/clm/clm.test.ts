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
import type { HttpClient } from "../../../crawl-core/ports.js";
import { clm, listUrl, offerUrl, parseClm } from "./clm.js";

// A page of the list: a hundred offers, or fifty on the last one.
const page = (n: number, last: boolean) =>
  JSON.stringify({
    data: {
      totalElements: 150,
      last,
      content: Array.from({ length: last ? 50 : 100 }, (_, k) => ({
        idOferta: n * 100 + k,
        oferta: `Peón ${n * 100 + k}`,
        ubicacion: "Toledo",
      })),
    },
  });

describe("clm (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(clm, await loadFixtureRoutes("clm")),
    ).toEqual([]);
  });

  it("maps an offer: its title as a sentence, its town and province, its facts and pay as written", async () => {
    const { drafts, total, last } = parseClm(
      await readFile(join(FIXTURES_DIRECTORY, "clm", "page-0.json"), "utf8"),
    );
    expect(total).toBe(3);
    expect(last).toBe(true);
    expect(drafts[0]).toMatchObject({
      sourceId: "17703",
      title: "Oficial/a de primera",
      company: "PROYECTOS ACO SL",
      city: "Torija",
      location: "Torija, Guadalajara, España",
      country: "es",
      language: "es",
      url: offerUrl("17703"),
      description:
        "Jornada: completa\nContrato: indefinido\nSalario: 25.103,23 € / Anual Bruto",
    });
    // A title in mixed case is kept as written.
    expect(drafts[1]?.title).toBe("Soldador");
  });

  it("keeps the last day an offer names", () => {
    const { drafts } = parseClm(
      JSON.stringify({
        data: {
          content: [
            {
              idOferta: 1,
              oferta: "Peón",
              ubicacion: "Toledo",
              fechaPostulacionHasta: "2026-12-01T00:00:00",
            },
          ],
        },
      }),
    );
    expect(drafts[0]).toMatchObject({ expires: "2026-12-01", city: "Toledo" });
  });

  it("reads pages of a hundred until the last one, asking for JSON", async () => {
    const http = new FakeHttpClient({
      [listUrl(0)]: page(0, false),
      [listUrl(1)]: page(1, true),
    });
    expect(await readDrafts(clm, fakeContext({ http }))).toHaveLength(150);
    expect(http.requests.map((request) => request.url)).toEqual([
      listUrl(0),
      listUrl(1),
    ]);
    expect(http.requests[0]?.options.headers).toEqual({
      accept: "application/json",
    });
  });

  it("fails a pass well short of the count, and a list that never ends", async () => {
    const short = new FakeHttpClient({
      [listUrl(0)]: JSON.stringify({
        data: {
          totalElements: 300,
          last: true,
          content: [{ idOferta: 1, oferta: "Peón", ubicacion: "Toledo" }],
        },
      }),
    });
    await expect(readDrafts(clm, fakeContext({ http: short }))).rejects.toThrow(
      "1 offers read of the 300 it counts",
    );
    const endless: HttpClient = {
      request: async (url) => ({
        status: 200,
        url,
        headers: {},
        body: JSON.stringify({
          data: {
            last: false,
            content: [{ idOferta: url, oferta: "Peón", ubicacion: "Toledo" }],
          },
        }),
      }),
    };
    await expect(
      readDrafts(clm, fakeContext({ http: endless })),
    ).rejects.toThrow("the list runs past 200 pages");
  });
});
