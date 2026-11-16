import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import {
  fakeContext,
  fakeDraft,
  readDrafts,
} from "../../../test/fakes/source-adapter.js";
import { kuntarekry } from "./adapters/kuntarekry/kuntarekry.js";
import { valtiolle } from "./adapters/valtiolle/valtiolle.js";
import { listUrl, parseList, PAGES_A_PASS } from "./kuntarekry-platform.js";

const fixture = (name: string) =>
  readFile(new URL(`../../../test/fixtures/${name}`, import.meta.url), "utf8");

const KUNTA = "https://kuntarekry.fi";
const VACANCY =
  "https://kuntarekry.fi/fi/tyopaikat/sairaanhoitaja-tyks-sydankeskus-sydanosasto-1-ja-2-turku-varha-04-500-26/";

// A list of `count` vacancies, `PAGE` at most per page.
const listOf = (from: number, count: number) =>
  JSON.stringify(
    Array.from({ length: count }, (_, k) => ({
      id: from + k,
      title: `Insinööri ${from + k}`,
      url: `/fi/tyopaikat/insinoori-${from + k}/`,
      location_tags: ["Tampere"],
      publication_end: "30.11.2026",
    })),
  );

describe("Kuntarekry platform: kuntarekry and valtiolle (public-feeds FR-1, FR-4)", () => {
  it("map their saved answers into valid adverts", async () => {
    for (const adapter of [kuntarekry, valtiolle]) {
      expect(
        await checkAdapterContract(
          adapter,
          await loadFixtureRoutes(adapter.definition.id),
        ),
      ).toEqual([]);
    }
  });

  it("map a listed vacancy, leaving open applications out", () => {
    const { drafts } = parseList(
      JSON.stringify([
        {
          id: 1929247,
          title: "Koordinaattori, asiakaspalvelu",
          url: "/fi/tyopaikat/koordinaattori-asiakaspalvelu-750703/",
          profit_center: "Espoon kaupunki",
          publication_date: "16.11.2026",
          publication_end: "30.11.2026",
          region: "Uusimaa",
          location_tags: ["Espoo", "Vantaa"],
        },
        {
          id: 2,
          title: "Avoin hakemus, sairaanhoitajat",
          url: "/fi/tyopaikat/x/",
        },
      ]),
      { id: "kuntarekry", base: KUNTA },
    );
    expect(drafts).toEqual([
      {
        source: "kuntarekry",
        sourceId: "1929247",
        title: "Koordinaattori, asiakaspalvelu",
        company: "Espoon kaupunki",
        location: "Espoo, Vantaa, Suomi",
        country: "fi",
        city: "Espoo",
        remote: false,
        url: "https://kuntarekry.fi/fi/tyopaikat/koordinaattori-asiakaspalvelu-750703/",
        description: "",
        posted: "2026-11-16",
        expires: "2026-11-30",
        occupationCodes: {},
        language: "fi",
      },
    ]);
  });

  it("read a new vacancy's page for its text, and keep a page that fails as listed", async () => {
    const http = new FakeHttpClient({
      [listUrl(KUNTA, 1)]: await fixture("kuntarekry/list-page-1.json"),
      [VACANCY]: await fixture("kuntarekry/vacancy-1929241.html"),
    });

    const drafts = await readDrafts(kuntarekry, fakeContext({ http }));

    expect(drafts).toHaveLength(3);
    expect(drafts[0]?.description).toMatch(/^Kiinnostaako sinua/);
    expect(drafts[1]?.description).toBe("");
    expect(http.requests).toHaveLength(1 + 3);
  });

  it("keep the text of a vacancy read before and its later closing day, without asking its page", async () => {
    const http = new FakeHttpClient({
      [listUrl(KUNTA, 1)]: listOf(1, 1),
    });
    const known = fakeDraft("kuntarekry", "1", {
      description: "Read before.",
      expires: "2026-12-15",
    });

    const [draft] = await readDrafts(
      kuntarekry,
      fakeContext({ http, previous: [known] }),
    );

    expect(draft).toMatchObject({
      description: "Read before.",
      expires: "2026-12-15",
    });
    expect(http.requests).toHaveLength(1);
  });

  it("page through the list until a short page", async () => {
    const http = new FakeHttpClient({
      [listUrl(KUNTA, 1)]: listOf(1, 48),
      [listUrl(KUNTA, 2)]: listOf(49, 5),
    });

    const drafts = await readDrafts(kuntarekry, fakeContext({ http }));

    expect(drafts).toHaveLength(53);
    expect(http.requests.slice(0, 2).map((r) => r.url)).toEqual([
      listUrl(KUNTA, 1),
      listUrl(KUNTA, 2),
    ]);
  });

  it(`read at most ${PAGES_A_PASS} vacancy pages a pass`, async () => {
    const routes: Record<string, string> = {};
    const pages = Math.ceil((PAGES_A_PASS + 10) / 48);
    for (let page = 1; page <= pages; page++) {
      const from = (page - 1) * 48 + 1;
      routes[listUrl(KUNTA, page)] = listOf(
        from,
        Math.min(48, PAGES_A_PASS + 10 - from + 1),
      );
    }
    const http = new FakeHttpClient(routes);

    const drafts = await readDrafts(kuntarekry, fakeContext({ http }));

    expect(drafts).toHaveLength(PAGES_A_PASS + 10);
    expect(http.requests).toHaveLength(pages + PAGES_A_PASS);
  });

  it("report an empty list as a failure", async () => {
    const http = new FakeHttpClient({ [listUrl(KUNTA, 1)]: "[]" });
    await expect(readDrafts(kuntarekry, fakeContext({ http }))).rejects.toThrow(
      "the feed holds no advert",
    );
  });
});
