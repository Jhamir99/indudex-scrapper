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
import type {
  HttpClient,
  HttpRequestOptions,
} from "../../../crawl-core/ports.js";
import { DOMAINS, MOST, parseVdab, plan, vdab, withRecord } from "./vdab.js";

const fixture = (file: string) =>
  readFile(join(FIXTURES_DIRECTORY, "vdab", file), "utf8");

const SEARCH = "https://www.vdab.be/rest/vindeenjob/v4/vacatureLight/zoek";
const RECORD = (id: string) =>
  `https://www.vdab.be/rest/vindeenjob/v4/vacatures/${id}`;

describe("vdab (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(vdab, await loadFixtureRoutes("vdab")),
    ).toEqual([]);
  });

  it("maps a vacancy: its town as a name, its facts once, its first day", async () => {
    const { size, drafts } = parseVdab(
      await fixture("search.json"),
      "voltijds",
    );
    expect(size).toBe(3);
    expect(drafts[0]).toMatchObject({
      sourceId: "74346415",
      title: "Tandartassistent(e) regio Hasselt",
      company: "OD TANDARTSEN",
      city: "Hasselt",
      location: "Hasselt, België",
      country: "be",
      language: "nl",
      posted: "2026-08-10",
      url: "https://www.vdab.be/vindeenjob/vacatures/74346415",
      description:
        "Vaste job · Dagwerk · voltijds · Beperkte ervaring ( < 2 jaar )",
    });
  });

  it("leaves closed vacancies out but counts them in the page's size", () => {
    const page = JSON.stringify({
      resultaten: [
        { id: { id: 1 }, vacaturefunctie: { naam: "Open" } },
        { id: { id: 2 }, vacaturefunctie: { naam: "Closed" }, gesloten: true },
      ],
    });
    const { size, drafts } = parseVdab(page);
    expect(size).toBe(2);
    expect(drafts.map((draft) => draft.sourceId)).toEqual(["1"]);
  });

  it("adds a vacancy's text, its profile and its offer, contacts cut out", async () => {
    const [first] = await readDrafts(
      vdab,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("vdab")),
        today: "2026-11-17",
      }),
    );
    expect(first?.description).toMatch(
      /^Vaste job · Dagwerk · \w+ · Beperkte ervaring \( < 2 jaar \)\nOdontolia is een belangrijke speler/,
    );
    const contacts = withRecord(
      fakeDraft("vdab", "1", { description: "Vaste job" }),
      JSON.stringify({
        functie: {
          omschrijving: {
            html: "<p>Bel 0471 23 45 67 of mail jan@firma.be</p>",
          },
        },
      }),
    );
    expect(contacts.description).toBe("Vaste job\nBel of mail");
  });
});

describe("plan", () => {
  it("keeps a search that fits, and cuts one too big by education, then by experience", async () => {
    const asked: string[] = [];
    const sizes = (criteria: Record<string, string[]>) => {
      asked.push(JSON.stringify(criteria));
      if (criteria["diplomaCodes"]?.[0] === "A")
        return criteria["ervaringCodes"] ? 100 : MOST + 1;
      return criteria["diplomaCodes"] ? 50 : MOST + 1;
    };
    const parts = await plan({ jobdomeinCodes: ["X"] }, async (c) => sizes(c));
    // Education A is still too big: cut again by experience (5 parts); B to F fit.
    expect(parts).toHaveLength(5 + 5);
    expect(parts[0]?.criteria).toEqual({
      jobdomeinCodes: ["X"],
      diplomaCodes: ["A"],
      ervaringCodes: ["0"],
    });
    expect(parts[5]?.criteria).toEqual({
      jobdomeinCodes: ["X"],
      diplomaCodes: ["B"],
    });
    expect(await plan({ jobdomeinCodes: ["X"] }, async () => 10)).toHaveLength(
      1,
    );
  });
});

// A search that counts `total` vacancies in each search and answers them in pages of a hundred,
// and a record for each.
function vdabServer(total: number) {
  const searches: Record<string, unknown>[] = [];
  const records: { url: string; options: HttpRequestOptions | undefined }[] =
    [];
  const http: HttpClient = {
    async request(url, options) {
      if (url === SEARCH) {
        const body = JSON.parse(options?.body ?? "{}") as {
          criteria: Record<string, string[]>;
          pagina: number;
          paginaGrootte: number;
        };
        searches.push(body);
        const first = body.pagina * body.paginaGrootte;
        const size = Math.max(0, Math.min(body.paginaGrootte, total - first));
        const domain = body.criteria["jobdomeinCodes"]?.[0];
        return {
          status: 200,
          url,
          headers: {},
          body: JSON.stringify({
            totaalAantal: total,
            resultaten: Array.from({ length: size }, (_, k) => ({
              id: { id: `${domain}${first + k}` },
              vacaturefunctie: { naam: `Job ${first + k}` },
            })),
          }),
        };
      }
      records.push({ url, options });
      return {
        status: 200,
        url,
        headers: {},
        body: JSON.stringify({
          functie: { omschrijving: { html: "<p>Text of the record</p>" } },
        }),
      };
    },
  };
  return { http, searches, records };
}

describe("vdab passes (public-feeds FR-1, FR-4)", () => {
  it("reads every domain and working time, paging a hundred at a time", async () => {
    const { http, searches } = vdabServer(150);
    const drafts = await readDrafts(
      vdab,
      fakeContext({ http, today: "2026-11-17" }),
    );
    // 150 in each of the six domains' two working times, the same ids for both working times.
    expect(drafts).toHaveLength(150 * DOMAINS.length);
    const pages = searches.filter((search) => search.paginaGrootte === 100);
    expect(pages.map((search) => search.pagina)).toEqual(
      DOMAINS.flatMap(() => [0, 1, 0, 1]),
    );
    expect(searches[0]).toMatchObject({
      criteria: { jobdomeinCodes: ["JOBCAT22"], arbeidsduurCodes: ["V"] },
      zoekmodus: "C2",
    });
  });

  it("asks each new vacancy's record once, with the site's key, and no more than a pass's share", async () => {
    const { http, records } = vdabServer(5);
    const drafts = await readDrafts(
      vdab,
      fakeContext({ http, today: "2026-11-17" }),
    );
    expect(records).toHaveLength(drafts.length);
    expect(records[0]?.url).toBe(RECORD("JOBCAT220"));
    expect(records[0]?.options?.headers).toMatchObject({
      accept: "application/json",
      "vej-key-monitor": expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(drafts[0]?.description).toMatch(/\nText of the record$/);
  });

  it("remembers the day of a whole pass, and between whole passes only asks records", async () => {
    const { http, searches } = vdabServer(5);
    let remembered: unknown;
    const first = await readDrafts(
      vdab,
      fakeContext({
        http,
        today: "2026-11-17",
        remember: (memory) => (remembered = memory),
      }),
    );
    expect(remembered).toEqual({ wholePassDay: "2026-11-17" });

    // Six hours later: nothing searched, the earlier vacancies kept with their records.
    const before = searches.length;
    const kept = await readDrafts(
      vdab,
      fakeContext({
        http,
        today: "2026-11-17",
        memory: remembered as never,
        previous: first,
      }),
    );
    expect(searches).toHaveLength(before);
    expect(kept).toEqual(first);

    // The next day: a whole pass again.
    await readDrafts(
      vdab,
      fakeContext({
        http,
        today: "2026-11-18",
        memory: remembered as never,
        previous: first,
      }),
    );
    expect(searches.length).toBeGreaterThan(before);
  });

  it("asks again the record of a vacancy kept with only the list's line", async () => {
    const { http, records } = vdabServer(0);
    const kept = await readDrafts(
      vdab,
      fakeContext({
        http,
        today: "2026-11-17",
        memory: { wholePassDay: "2026-11-17" },
        previous: [
          fakeDraft("vdab", "1", { description: "Vaste job" }),
          fakeDraft("vdab", "2", { description: "Vaste job\nRead before." }),
        ],
      }),
    );
    expect(records.map((record) => record.url)).toEqual([RECORD("1")]);
    expect(kept.map((draft) => draft.description)).toEqual([
      "Vaste job\nText of the record",
      "Vaste job\nRead before.",
    ]);
  });

  it("fails a search that answers nothing", async () => {
    await expect(
      readDrafts(
        vdab,
        fakeContext({ http: vdabServer(0).http, today: "2026-11-17" }),
      ),
    ).rejects.toThrow("the search answered nothing");
  });
});
