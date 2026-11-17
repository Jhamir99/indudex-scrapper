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
import type { HttpClient } from "../../../crawl-core/ports.js";
import { cityOf, groupUrl, parseUzt, uzt } from "./uzt.js";

describe("uzt (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(uzt, await loadFixtureRoutes("uzt")),
    ).toEqual([]);
  });

  it("maps a vacancy: the ISCO group from its code, its town, its text and its pay", async () => {
    // The first vacancy is a saved answer; the second is made up (no pay line from a single
    // field, a range, a postcode after the town).
    const drafts = parseUzt(
      await readFile(join(FIXTURES_DIRECTORY, "uzt", "group-251.json"), "utf8"),
    );
    expect(drafts[0]).toMatchObject({
      sourceId: "DV-19-996710217",
      title: "Informacinių ir ryšių technologijų sistemų analitikas",
      company: 'UAB "Informacinių technologijų organizacija"',
      city: "Kaunas",
      location: "Kaunas, Lietuva",
      country: "lt",
      language: "lt",
      occupationCodes: { isco: "2511" },
      posted: "2026-11-09",
      expires: "2026-12-31",
      url: "https://uzt.lt/laisvos-darbo-vietos/436/p1/skelbimas/DV-19-996710217",
    });
    expect(drafts[0]?.description).toMatch(/^-Verslo poreikių analizė;/);
    expect(drafts[0]?.description).toMatch(
      /\n5\n.*\nAtlyginimas: 4132\.23 EUR per mėnesį prieš mokesčius$/s,
    );
    expect(drafts[1]).toMatchObject({
      city: "Vilnius",
      occupationCodes: { isco: "7412" },
    });
    expect(drafts[1]?.description).toMatch(
      /Atlyginimas: 1800–2400 EUR per mėnesį prieš mokesčius$/,
    );
  });

  it("takes the town before the country and drops a postcode", () => {
    expect(cityOf("Savanorių pr. 176C, Vilnius, Lietuva")).toBe("Vilnius");
    expect(cityOf("Pašilės g. 19, Kaunas 51230, Lietuva")).toBe("Kaunas");
    expect(cityOf(null)).toBe("");
  });

  it("asks each minor group of our scope for the vacancies still open", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("uzt"));
    await readDrafts(uzt, fakeContext({ http, today: CONTRACT_DAY }));
    const asked = http.requests.map((request) => request.url);
    expect(asked).toContain(groupUrl("251", CONTRACT_DAY));
    expect(asked).toContain(groupUrl("741", CONTRACT_DAY));
    expect(asked).toHaveLength(17);
    expect(groupUrl("251", "2026-11-17")).toMatch(
      /\?galioja_iki>="2026-11-17"&profesijos_kodas\.startswith\("251"\)&limit\(2000\)&select\(darbo_vietos_id,/,
    );
  });

  it("skips a group that answers a web page, and fails only when every group fails", async () => {
    const mixed: HttpClient = {
      request: async (url) => ({
        status: 200,
        url,
        headers: {},
        body: url.includes('("251")')
          ? JSON.stringify({
              _data: [
                {
                  darbo_vietos_id: "DV-1",
                  profesijos_kodas: "251101",
                  profesijos_pareigybes_pav: "Programuotojas",
                },
              ],
            })
          : "<html>Maintenance</html>",
      }),
    };
    expect(await readDrafts(uzt, fakeContext({ http: mixed }))).toHaveLength(1);
    const broken: HttpClient = {
      request: async (url) => ({
        status: 200,
        url,
        headers: {},
        body: "<html/>",
      }),
    };
    await expect(
      readDrafts(uzt, fakeContext({ http: broken })),
    ).rejects.toThrow("every group failed");
  });
});
