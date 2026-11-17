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
import {
  emcan,
  listUrl,
  offerUrl,
  PAGES_A_PASS,
  parseList,
  withPage,
} from "./emcan.js";

const fixture = (file: string) =>
  readFile(join(FIXTURES_DIRECTORY, "emcan", file), "utf8");

describe("emcan (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(emcan, await loadFixtureRoutes("emcan")),
    ).toEqual([]);
  });

  it("maps a row: its post as a sentence without its number of posts, its town as a name, its day", async () => {
    const { total, drafts, posts } = parseList(await fixture("list.html"));
    expect(total).toBe(3);
    expect(drafts[0]).toMatchObject({
      sourceId: "062026003619",
      title: "Ayudante de camarero",
      company: "",
      city: "Comillas",
      location: "Comillas, Cantabria, España",
      country: "es",
      language: "es",
      posted: "2026-11-17",
      description: "",
      url: offerUrl("062026003619"),
    });
    // "2 AYUDANTE DE COCINA.": two posts, the closing dot dropped.
    expect(drafts[1]?.title).toBe("Ayudante de cocina");
    expect(posts.get("062026003615")).toBe(2);
    expect(posts.get("062026003619")).toBe(1);
  });

  it("adds an offer's own page: its text, its occupation and its last day, with the number of posts", async () => {
    const [draft] = parseList(await fixture("list.html")).drafts;
    const read = withPage(
      { ...draft!, sourceId: "062026003611" },
      await fixture("offer-062026003611.html"),
      3,
    );
    expect(read.expires).toBe("2026-12-03");
    expect(read.description).toMatch(/^Empresa ubicada en Maliaño, precisa/);
    expect(read.description).toMatch(
      /\nOcupación: Mozos de carga y descarga, almacén y\/o mercado de abastos · Puestos: 3$/,
    );
    // A page that says nothing leaves the offer as listed.
    expect(withPage(draft!, "<html/>")).toEqual(draft);
  });

  it("reads each new offer's page once, up to a pass's share, and keeps what it read before", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("emcan"));
    const first = await readDrafts(emcan, fakeContext({ http }));
    // Only the third offer's page is saved: the others fail and stay as listed.
    expect(first.map((draft) => draft.description.length > 0)).toEqual([
      false,
      false,
      true,
    ]);
    expect(PAGES_A_PASS).toBe(60);

    const again = new FakeHttpClient({
      [listUrl()]: await fixture("list.html"),
    });
    const second = await readDrafts(
      emcan,
      fakeContext({ http: again, previous: first }),
    );
    // The third is not asked again; the two others are, and fail again.
    expect(again.requests.map((request) => request.url)).toEqual([
      listUrl(),
      offerUrl("062026003619"),
      offerUrl("062026003615"),
    ]);
    expect(second[2]?.description).toBe(first[2]?.description);
    expect(second[2]?.expires).toBe("2026-12-03");
  });

  it("fails a list read well short of its count", async () => {
    const http = new FakeHttpClient({
      [listUrl()]: "<div>Mostrando 100 resultados.</div>",
    });
    await expect(readDrafts(emcan, fakeContext({ http }))).rejects.toThrow(
      "0 offers read of the 100 it counts",
    );
  });
});
